import std/[json, httpclient, xmlparser, xmltree]
import jester
import asynchttpserver

settings:
  port = Port(5003)

router viesRouter:
  # Health check
  get "/health":
    resp Http200, {"Content-Type": "application/json"}, $(%*{"status": "ok", "service": "vies-service"})

  get "/api/vies/validate/@vatNumber":
    let vatNumber = @"vatNumber"
    if vatNumber.len < 3:
      resp Http400, {"Content-Type": "application/json"}, """{"error": "VAT number too short"}"""
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

        let xml = parseXml(responseBody)
        let validNodes = xml.findAll("valid")
        if validNodes.len > 0:
          isValid = validNodes[0].innerText == "true"

        let nameNodes = xml.findAll("name")
        if nameNodes.len > 0:
          name = nameNodes[0].innerText

        let addressNodes = xml.findAll("address")
        if addressNodes.len > 0:
          longAddress = addressNodes[0].innerText

        resp Http200, {"Content-Type": "application/json"}, $(%*{
          "valid": isValid,
          "name": name,
          "longAddress": longAddress,
          "vatNumber": vatNumber
        })
      except:
        resp Http500, {"Content-Type": "application/json"}, """{"error": "Failed to validate VAT number"}"""

proc main() =
  let p = Port(5003)
  let settings = newSettings(port=p)
  var jester = initJester(viesRouter, settings=settings)
  echo "VIES Service started on port 5003"
  jester.serve()

if isMainModule:
  main()