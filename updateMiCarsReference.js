//This function can be expanded later to handle more updates over the MiCars Invoice number
function updateMiCarsReference(feeSeq, altId, invNum, mInvoiceNumber)
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
	var uri = baseURL + "accela/reference"

	var time = epochTime();
	var nonce = newGuid();
	var method = "PUT"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";


	//Create JSON request body
	var pushInvJSON = new Object();
	pushInvJSON.ReferenceId = altId + "";
	pushInvJSON.InvoiceNumber = invNum + "";
	pushInvJSON.MicarsInvoiceNumber = mInvoiceNumber;
	requestBody = JSON.stringify(pushInvJSON);

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
	restHeaders.put("Method", "PUT");
	restHeaders.put("Authorization", "amx " + auth);


	var r = aa.httpClient.post(uri, restHeaders, requestBody);
	if (r.getSuccess())
	{
		logDebug("SUCCESS! in calling MiCars update reference Web Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars reference web service " + r.getErrorMessage())
		return false;
	}
}