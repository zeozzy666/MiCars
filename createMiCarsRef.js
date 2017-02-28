/*
* NOTE: Pass null for parameter 'invScriptObject' to send the Renewal scenario to MiCars (Current Year for Invoice Number, $0 for Invoice Amount)
*/
function createMiCarsRef(feeSeq, invScriptObject)
{
	if (arguments.length == 3)
	{
		itemCap = arguments[2];
	}
	else
	{
		itemCap = capId;
		var iCapResult = aa.cap.getCap(itemCap);
		if(!iCapResult.getSuccess)
		{
			aa.print("Problem getting CAP for cap ".replace("cap", itemCap.getCusomtID()));
			return false;
		}
		var iCap = iCapResult.getOutput();
	}

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
	var method = "POST"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";


	//Create JSON request body
	var pushInvJSON = new Object();
	pushInvJSON.ReferenceId = (invScriptObject == null) ? itemCap.getCustomID() + "--R" : itemCap.getCustomID() + "";
	pushInvJSON.InvoiceNumber = (invScriptObject == null) ? ""+sysDate.getYear() : invScriptObject.getInvoiceNbr() + "";
	pushInvJSON.CustomerName = iCap.getSpecialText() + "";
	pushInvJSON.InvoiceAmount = (invScriptObject == null) ? "0" : invScriptObject.getFee() + "";
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
	restHeaders.put("Method", "POST");
	restHeaders.put("Authorization", "amx " + auth);


	var r = aa.httpClient.post(uri, restHeaders, requestBody);
	if (r.getSuccess())
	{
		logDebug("SUCCESS! in calling MiCars reference Web Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars reference web service " + r.getErrorMessage())
		return false;
	}
}
