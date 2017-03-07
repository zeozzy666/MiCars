function getMiCarsCustomer(contactRefId)
{
	
	//Include CryptoJS for Authentication
	if("undefined".equals(typeof(CryptoJS)))
	{
		eval(getScriptText("CRYPTOJS"));
	}

	//Start putting together request
	var settingsSC = "MICARS_SETTINGS";
	var key = lookup(settingsSC, "KEY");
	var sharedSecret = lookup(settingsSC, "SECRET"); 
	var baseURL = lookup(settingsSC, "BASE_URL");
	var uri = baseURL + "customers?accountId=$refid$".replace("$refid$", contactRefId);

	var time = epochTime();
	var nonce = newGuid();
	var method = "GET"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";

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
		logDebug("SUCCESS! in calling MiCars getCustomer Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars getCustomer web service " + r.getErrorMessage())
		return false;
	}
}