import std/[json, httpclient, xmlparser, xmltree]

proc validateVat*(vatNumber: string): Future[string] {.async.} =
  let client = newAsyncHttpClient()
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
  
  let response = await client.post(url, body = body)
  let responseBody = await response.body

  var
    isValid: bool = false
    name: string = ""
    longAddress: string = ""

  try:
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
  except:
    return %*{"valid": false, "errorMessage": "Failed to parse VIES response"}

  return %*{"valid": isValid, "name": name, "longAddress": longAddress, "vatNumber": vatNumber}
