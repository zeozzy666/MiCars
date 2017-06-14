function handleMiCars(feeSeqArray)
{
  //Variables
  var mInvoice = null;
  var result = null;
  var mInvoiceNumber = null;

  //Get Invoice
  var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeSeqArray[0], aa.util.newQueryFormat());
  if (!inv.getSuccess())
  {
    logDebug("Problem getting invoice for cap $capid$".replace("$capid$", capId.getCustomID()));
    logDebug(inv.getErrorMessage());
    return false;
  }
  if (inv.getOutput().length == 0)
  {
    logDebug("Getting invoice successful but length is zero");
    return false;
  }

  inv = inv.getOutput();
  var invNum = inv[0].getInvoiceNbr();

  //Check to see if customer exists in MiCars
  contactJSON = getMiCarsCustomer(capId.getCustomID());
  var contMiCars = null;
  if(contactJSON)
  {
    logDebug("**MICARSINFO** SUCCESS! in calling getMiCarsCustomer, response for  " + capId.getCustomID() + " " +  contactJSON);
    contMiCars = JSON.parse(contactJSON);
  }
  
  if(!contMiCars || !contMiCars.AccountId || contMiCars.AccountId == 0)
  {
    //get address
    var addresses = getCapAddresses();
    //Get Business Contact
    var bizContact = getContactByType("Business", capId);
    //createa micars contact
    var miCarsCont = createMiCarsContact(bizContact, addresses[0], capId.getCustomID());
    if (miCarsCont)
    {
      logDebug("**MICARSINFO** SUCCESS! in calling createMiCarsContact, response for " + capId.getCustomID() + " " + miCarsCont);
    }
  }
  mInvoice = pushMiCarsInvoice(feeSeqArray);

  //Get MiCars Invoice Number
  if (mInvoice)
  {
    logDebug("**MICARSINFO** SUCCESS! in calling pushMiCarsInvoice, reponse for  " + capId.getCustomID() + " "  + mInvoice);

    var mInvoiceObject = JSON.parse(mInvoice);
    mInvoiceNumber = mInvoiceObject.Invoice.InvoiceNumber;
  }

  //Create MiCars Reference Data
  result = createMiCarsRef(mInvoiceNumber, inv[0]);
  if (result)
  {
    logDebug("**MICARSINFO** SUCCESS! in calling createMiCarsRef, response for " + capId.getCustomID() + " " + result);
    //Update the feeitem UDF so we don't process it again
    for (f2 in feeSeqArray)
    {
      updateFeeItemUDF(feeSeqArray[f2], "MICARS", null, null, null);
    }
  }
}
function voidMiCarsInvoice(referenceId, accelaInv, micarsInvoiceNumber, comments)
{
	itemCap = capId;

	var iCapResult = aa.cap.getCap(itemCap);
	if(!iCapResult.getSuccess)
	{
		logDebug("Problem getting CAP for cap ".replace("cap", itemCap.getCusomtID()));
		return false;
	}
	var iCap = iCapResult.getOutput();

	//First we need to get MiCars Invoice number to void
	var miCarsRefData = null;
	var miCarsInv = null;
	miCarsRefData = getMiCarsRefData(referenceId, accelaInv, micarsInvoiceNumber);

	if (miCarsRefData)
	{
		logDebug("**MICARSINFO** SUCCESS! in calling getMiCarsRefData for voidMiCarsInvoice with response " + miCarsRefData);
		miCarsRefData = JSON.parse(miCarsRefData);
		if (miCarsRefData && miCarsRefData.length > 0 &&  miCarsRefData[0].MicarsInvoiceNumber)
		{
			miCarsInv = miCarsRefData[0].MicarsInvoiceNumber;
		}
		else
		{
			logDebug("**MICARSINFO** getMiCarsRefData for voidMiCarsInvoice did not return a valid MicarsInvoiceNumber ");
			return false;
		}
	}
	else
	{
		return false;
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
	var uri = baseURL + "receivables/writeOff"

	var time = epochTime();
	var nonce = newGuid();
	var method = "POST"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";


	//Create JSON request body
	var writeOffObj = new Object();
	writeOffObj.InvoiceNumber = miCarsInv;
	writeOffObj.Reason = "A";
	writeOffObj.Comments = (comments) ? comments : "A";
	requestBody = JSON.stringify(writeOffObj);

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
		logDebug("FAILED to call voidMiCarsInvoice web service " + r.getErrorMessage());
		return false;
	}
}
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
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars update reference web service " + r.getErrorMessage())
		return false;
	}
}
/*
* NOTE: Pass null for parameter 'invScriptObject' to send the Renewal scenario to MiCars (Current Year for Invoice Number, $0 for Invoice Amount)
*/
function createMiCarsRef(mInvoiceNum, invScriptObject)
{
	itemCap = (arguments.length > 2) ? arguments[2] : capId

	var iCapResult = aa.cap.getCap(itemCap);
	if(!iCapResult.getSuccess)
	{
		logDebug("Problem getting CAP for cap ".replace("cap", itemCap.getCusomtID()));
		return false;
	}
	var iCap = iCapResult.getOutput();


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


	//Get invoice total amount
	var invNum = (invScriptObject == null) ? null : invScriptObject.getInvoiceNbr() + "";
	tAmount = (invNum == null) ? null : aa.finance.getInvoiceAmountExceptVoidCredited(itemCap, invNum).getOutput();
	//Create JSON request body
	var pushInvJSON = new Object();
	pushInvJSON.ReferenceId = (invScriptObject == null) ? itemCap.getCustomID() + "/R" : itemCap.getCustomID() + "";
	pushInvJSON.InvoiceNumber = (invScriptObject == null) ? ""+sysDate.getYear() : invScriptObject.getInvoiceNbr() + "";
	pushInvJSON.CustomerName = iCap.getSpecialText() + "";
	pushInvJSON.InvoiceAmount = (tAmount == null) ? null : tAmount + "";
	pushInvJSON.MicarsInvoiceNumber = (mInvoiceNum == null) ? "" : mInvoiceNum + "";
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
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars reference web service " + r.getErrorMessage())
		return false;
	}
}
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
        logDebug("**MICARSINFO** Calling createMiCarsInvoice with request boody: " + requestBody);

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
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars getCustomer web service " + r.getErrorMessage())
		return false;
	}
}
function createMiCarsContact(peopleModel, addressModel, accountId)
{
	//Variables
	var result = null;


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
	var uri = baseURL + "customers";

	var time = epochTime();
	var nonce = newGuid();
	var method = "POST"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";
	var today = new Date();


	//Create JSON request body
	var contact = new Object();
	contact.Division = "PPPM";
	contact.customername = peopleModel.getBusinessName() + ""; //Get name from Business Contact
	contact.customFirstName = peopleModel.getFirstName() + "";
	contact.customerMiddleName = peopleModel.getMiddleName() + "";
	contact.idNum = accountId + "";
	contact.programcode = "NURS";
	contact.accountId = accountId + "";
	contact.customerType = "NON-GOV";
	contact.addresses = new Array();

	//Cap Address
	var address = new Object();
	address.address1 = addressModel.getAddressLine1() + "";
	address.city = addressModel.getCity() + "";
	address.stateOrProvince = addressModel.getState() + "";
	address.zip = addressModel.getZip() + "";
	address.primary = true;
	address.addressReason = "OFFICE";
	//address.country = "USA";
	//address.county = "01";
	address.contacts = new Array();

/*	var subContact = new Object();
	subContact.ContactName = peopleModel.firstName + " " + peopleModel.lastName + "";
	subContact.primary = true;
	subContact.phones = new Array();


	var phone = new Object();
	phone.PhoneType = "";
	phone.PhoneAreaCode = ""; 
	phone.PhoneNum = peopleModel.phone1 + "";

	subContact.phones.push(phone);
	address.contacts.push(subContact);

	contact.emails = new Array();

	var email = new Object();
	email.emailaddress = peopleModel.email + "";

	contact.emails.push(email);
*/
	contact.addresses.push(address);

	//Stringify
	requestBody = JSON.stringify(contact);
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
		logDebug("FAILED to call MiCars createCustomer web service " + r.getErrorMessage())
		return false;
	}
}
function getRevenue(fromDate, toDate)
{
	//Variables
	var settingsSC = "MICARS_SETTINGS";
	var key = lookup(settingsSC, "KEY");
	var sharedSecret = lookup(settingsSC, "SECRET"); 
	var baseURL = lookup(settingsSC, "BASE_URL");
	var uri = baseURL + "revenue?controlNumber=&startingDateToSigma=$fromdate$&endingDateToSigma=$todate$&interfaced=false".replace("$fromdate$", fromDate).replace("$todate$", toDate);

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
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to getRevenue from Web Service " + r.getErrorMessage())
		return false;
	}
}
function getMiCarsRefData(referenceId, accelaInv, micarsInvoiceNumber)
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
	var uri = baseURL + "accela/reference?";

	if (referenceId)
	{
		uri += "ReferenceId=$referenceId$&".replace("$referenceId$", referenceId);
	}
	if (accelaInv)
	{
		uri += "InvoiceNumber=$accelaInv$&".replace("$accelaInv$", accelaInv);
	}
	if (micarsInvoiceNumber)
	{
		uri += "MicarsInvoiceNumber=$micarsInvoiceNumber$".replace("$micarsInvoiceNumber$", micarsInvoiceNumber);
	}
logDebug("getMiCarsRefData URI is " + uri)
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
		return r.getOutput();
	}
	else
	{
		logDebug("**MICARSINFO** FAILED to call MiCars getCustomer web service " + r.getErrorMessage())
		return false;
	}
}
function newGuid() 
{
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0, v = c == "x" ? r : r & 0x3 | 0x8; return v.toString(16); });
}
function epochTime() 
{
    var d = new Date();
    var t = d.getTime();
    var o = t + "";
    return o.substring(0, 10);
}