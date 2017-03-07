function getRevenue(fromDate, toDate)
{
	//Variables
	var settingsSC = "MICARS_SETTINGS";
	var key = lookup(settingsSC, "KEY");
	var sharedSecret = lookup(settingsSC, "SECRET"); 
	var baseURL = lookup(settingsSC, "BASE_URL");
	var uri = baseURL + "revenue?controlNumber=&startingDateToMain=$fromdate$&endingDateToMain=$todate$&interfaced=false".replace("$fromdate$", fromDate).replace("$todate$", toDate);

	var time = epochTime();
	var nonce = newGuid();
	var method = "GET"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";

	//Include CryptoJS for Authentication
	if("undefined".equals(typeof(CryptoJS)))
	{
		eval(getScriptText("CRYPTOJS"));
	}

	var b64BodyContent = "";
	if(requestBody){
	    // MD5 hash and convert the request body string to base 64
	    b64BodyContent = CryptoJS.MD5(requestBody).toString(CryptoJS.enc.Base64);
	}

	var rawSignature = key + method + encodedUri + time + nonce + b64BodyContent;

	var signature = CryptoJS.HmacSHA256(rawSignature, sharedSecret).toString(CryptoJS.enc.Base64);
	var auth = key + ":" + signature + ":" + nonce + ":" + time;
	var restHeaders = aa.util.newHashMap();
	restHeaders.put("Content-Type", "application/json");
	restHeaders.put("Accept", "application/json");
	restHeaders.put("Method", "GET");
	restHeaders.put("Authorization", "amx " + auth);


	var r = aa.httpClient.get(uri, restHeaders);
	if (r.getSuccess())
	{
		logDebug("SUCCESS! in calling getRevenue Web Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to getRevenue from Web Service " + r.getErrorMessage)
		return null;
	}
}