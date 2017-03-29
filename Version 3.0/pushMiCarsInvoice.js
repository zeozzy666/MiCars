function pushMiCarsInvoice(feeSeqArray)
{
	//Include CryptoJS for Authentication
	if("undefined".equals(typeof(CryptoJS)))
	{
		eval(getScriptText("CRYPTOJS"));
	}

	//Variables
	var result = null;
	//Create JSON request body
	var pushInvJSON = new Object();
	pushInvJSON.Details = new Array();
	var today = new Date();
	var month = parseInt(today.getMonth()) + 1;
	var requestBody = "";
	
	//loop through each fee item
	for (f in feeSeqArray)
	{
		//Get Fee information
		var feeResult = aa.finance.getFeeItemByPK(capId, feeSeqArray[f]);
		if (!feeResult.getSuccess())
		{
			logDebug("Problem getting fees for capid ".replace("capid", capId.getCustomID()) + feeResult.getErrorMessage());
			continue;
		}

		var fee = feeResult.getOutput();
		var f4fee =	fee.getF4FeeItem();

		var feesConfigSc = "MICARS_RECEIVABLES";
		var feeConfig = lookup(feesConfigSc, f4fee.getFeeCod());
		if (!feeConfig) continue;	

		//Get Program, Division and SKU
		var mDivision = feeConfig.split("/")[0];
		var mProgram = feeConfig.split("/")[1];
		var mSku = f4fee.getAccCodeL1();
		//mSku = parseInt(mSku, 10);

		pushInvJSON.AgencyCode = "791";
		pushInvJSON.Division = mDivision + "";
		pushInvJSON.Program = mProgram  + "";
		pushInvJSON.InvoiceCode = "FEE";
		pushInvJSON.FiscalYear = today.getFullYear() + "";
		pushInvJSON.accountId = capId.getCustomID() + "";

		pushInvJSON.InvoiceDate = today.getFullYear() + "-" + month + "-" + today.getDate();
		pushInvJSON.permitNumber = capId.getCustomID() + "";
		pushInvJSON.InterfaceType = "ACCELA";
		


		//Details
		var detatilsJSON = new Object();
		detatilsJSON.Description = fee.getFeeDescription() + "";
		detatilsJSON.Quantity = "1";
		detatilsJSON.UnitCost = fee.getFee() + "";
		detatilsJSON.TotalCost = fee.getFee() + "";
		detatilsJSON.SalesTax = "false";
		detatilsJSON.SKUNUMBER = mSku + "";

		//push to JSON object
		pushInvJSON.Details.push(detatilsJSON);
	}

	//Stringify
	requestBody = JSON.stringify(pushInvJSON);
	
	//Start putting together request
	var settingsSC = "MICARS_SETTINGS";
	var key = lookup(settingsSC, "KEY");
	var sharedSecret = lookup(settingsSC, "SECRET"); 
	var baseURL = lookup(settingsSC, "BASE_URL");
	var uri = baseURL + "receivables";

	var time = epochTime();
	var nonce = newGuid();
	var method = "POST"
	var encodedUri = encodeURIComponent(uri).toLowerCase();

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
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars create Invoice web service " + r.getErrorMessage())
		return false;
	}	
}