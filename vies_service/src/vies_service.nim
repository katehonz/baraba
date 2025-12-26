import std/[json, httpclient, xmlparser, xmltree, strutils, os]
import jester
import asynchttpserver
import baraba_shared/utils/security

settings:
  port = Port(5003)

# CORS headers
const corsHeaders = @{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
}

# JWT Auth helper
proc verifyAuth(request: jester.Request): tuple[valid: bool, userId: int64, username: string, error: string] =
  let authHeader = request.headers.getOrDefault("Authorization")
  if authHeader.len == 0:
    return (false, 0'i64, "", "Missing Authorization header")
  if not authHeader.startsWith("Bearer "):
    return (false, 0'i64, "", "Invalid Authorization header format")
  let token = authHeader[7..^1]
  let (valid, userId, username) = verifyToken(token)
  if not valid:
    return (false, 0'i64, "", "Invalid or expired token")
  return (true, userId, username, "")

router viesRouter:
  # CORS preflight handler
  options "/api/vies/validate/@vatNumber":
    resp Http200, corsHeaders, ""

  # Health check (public)
  get "/health":
    resp Http200, {"Content-Type": "application/json"}, $(%*{
      "status": "ok",
      "service": "vies-service",
      "jwtConfigured": getEnv("JWT_SECRET", "").len > 0
    })

  # VIES validation (protected)
  get "/api/vies/validate/@vatNumber":
    let auth = verifyAuth(request)
    if not auth.valid:
      resp Http401, @{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}, $(%*{"error": auth.error})

    let vatNumber = @"vatNumber"
    echo "VIES validation request from user: " & auth.username
    if vatNumber.len < 3:
      resp Http400, @{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}, """{"error": "VAT number too short"}"""
    else:
      let client = newHttpClient(timeout = 10000)  # 10 sec timeout
      defer: client.close()
      let url = "http://ec.europa.eu/taxation_customs/vies/services/checkVatService"
      let body = """
        <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
           <soapenv:Header/>
           <soapenv:Body>
              <urn:checkVat>
                 <urn:countryCode>""" & vatNumber[0..1] & """</urn:countryCode>
                 <urn:vatNumber>""" & vatNumber[2..^1] & """</urn:vatNumber>
              </urn:checkVat>
           </soapenv:Body>
        </soapenv:Envelope>
      """

      try:
        let response = client.post(url, body = body)
        let responseBody = response.body

        var
          isValid: bool = false
          name: string = ""
          longAddress: string = ""

        # Helper to find element by local name (ignoring namespace prefix)
        proc findByLocalName(node: XmlNode, localName: string): XmlNode =
          for child in node:
            if child.kind == xnElement:
              let tag = child.tag
              # Check if tag ends with :localName or equals localName
              if tag == localName or tag.endsWith(":" & localName):
                return child
              # Recursively search children
              let found = findByLocalName(child, localName)
              if found != nil:
                return found
          return nil

        let xml = parseXml(responseBody)

        let validNode = findByLocalName(xml, "valid")
        if validNode != nil:
          isValid = validNode.innerText == "true"

        let nameNode = findByLocalName(xml, "name")
        if nameNode != nil:
          name = nameNode.innerText

        let addressNode = findByLocalName(xml, "address")
        if addressNode != nil:
          longAddress = addressNode.innerText

        resp Http200, @{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}, $(%*{
          "valid": isValid,
          "name": name,
          "longAddress": longAddress,
          "vatNumber": vatNumber
        })
      except:
        resp Http500, @{"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}, """{"error": "Failed to validate VAT number"}"""

proc main() =
  let p = Port(5003)
  let settings = newSettings(port=p)
  var jester = initJester(viesRouter, settings=settings)
  echo "VIES Service started on port 5003"
  jester.serve()

if isMainModule:
  main()