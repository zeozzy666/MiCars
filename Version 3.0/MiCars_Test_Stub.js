capId = aa.cap.getCapID("NURRL-200583").getOutput();
cap = aa.cap.getCap(capId).getOutput();
feeSeqList = new Array();
paymentPeriodList = new Array();
publicUser = false;
contactArray = getContactArray();
//pushAutoAssessedFees2MiCars();
feeSeq = addFee("NUR_MILE","NURSERY INSPECTION FEES","FINAL",1,"Y", capId);
//inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeSeq, aa.util.newQueryFormat()).getOutput();
//updateMiCarsReference(feeSeq, capId.getCustomID(), inv[0].getInvoiceNbr();, "123");
//printMethods(inv[0]);
		//Get primary contact
//createa micars contact
//addresss = getCapAddresses();
//var bizContact = getContactByType("Business", capId);
//r = createMiCarsContact(bizContact, addresss[0], capId.getCustomID());
//r = getMiCarsCustomer("NURDL-200580");
//r = createMiCarsRef(feeSeq);
//r = getRevenue("2017-02-19", "2017-02-20");
//aa.print(r);
//r = getCapAddresses();
//aa.print(r[0].getClass())
//r = getContactByType("Business", capId);
//r = getCapAddresses()
//printMethodsWithValues(r[0]);
//handleMiCars(123);

/*var fees = aa.finance.getFeeItemByCapID(capId).getOutput();
for (var x in fees)
{
	//r = pushMiCarsInvoice(fees[x].getF4FeeItem().getFeeSeqNbr());
	handleMiCars(fees[x].getF4FeeItem().getFeeSeqNbr());
}
*/
/////////////////////////////////////////////////////////////////////MICARS FUNCTIONS////////////////////////////////////////////////////////////////
function addFee(fcode, fsched, fperiod, fqty, finvoice) // Adds a single fee, optional argument: fCap
{
	// Updated Script will return feeSeq number or null if error encountered (SR5112)
	var feeCap = capId;
	var feeCapMessage = "";
	var feeSeq_L = new Array(); // invoicing fee for CAP in args
	var paymentPeriod_L = new Array(); // invoicing pay periods for CAP in args
	var feeSeq = null;
	if (arguments.length > 5) {
		feeCap = arguments[5]; // use cap ID specified in args
		feeCapMessage = " to specified CAP";
	}

	assessFeeResult = aa.finance.createFeeItem(feeCap, fsched, fcode, fperiod, fqty);
	if (assessFeeResult.getSuccess()) {
		feeSeq = assessFeeResult.getOutput();
		logMessage("Successfully added Fee " + fcode + ", Qty " + fqty + feeCapMessage);
		logDebug("The assessed fee Sequence Number " + feeSeq + feeCapMessage);

		if (finvoice == "Y" && arguments.length == 5) // use current CAP
		{
			feeSeqList.push(feeSeq);
			paymentPeriodList.push(fperiod);
		}
		if (finvoice == "Y" && arguments.length > 5) // use CAP in args
		{
			feeSeq_L.push(feeSeq);
			paymentPeriod_L.push(fperiod);
			var invoiceResult_L = aa.finance.createInvoice(feeCap, feeSeq_L, paymentPeriod_L);
			if (invoiceResult_L.getSuccess())
			{
				logMessage("Invoicing assessed fee items" + feeCapMessage + " is successful.");
			}
			else
			{
				logDebug("**ERROR: Invoicing the fee items assessed" + feeCapMessage + " was not successful.  Reason: " + invoiceResult.getErrorMessage());
			}
		}
		updateFeeItemInvoiceFlag(feeSeq, finvoice);
		//Push invoice to MiCars
		if (finvoice == "Y")
		{
			logDebug("Starting to push invoice to MiCars...");
			handleMiCars(feeSeq);
		}
	} else {
		logDebug("**ERROR: assessing fee (" + fcode + "): " + assessFeeResult.getErrorMessage());
		feeSeq = null;
	}

	return feeSeq;

}
function handleMiCars(feeSeq)
{
	//Variables
	var mInvoice = null;
	var result = null;
	var mInvoiceNumber = null;

	//Get Invoice for feeSeq
	var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeSeq, aa.util.newQueryFormat());
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
	var contMiCars = JSON.parse(contactJSON);
	if(!contMiCars || !contMiCars.accountId || contMiCars.accountId == 0)
	{
		//get address
		var addresses = getCapAddresses();
		//Get Business Contact
		var bizContact = getContactByType("Business", capId);
		//createa micars contact
		var miCarsCont = createMiCarsContact(bizContact, addresses[0], capId.getCustomID());
		if (miCarsCont)
		{
			logDebug("SUCCESS! in calling MiCars createCustomer Web Service " + miCarsCont);
		}
	}
	mInvoice = pushMiCarsInvoice(feeSeq);

	//Get MiCars Invoice Number
	if (mInvoice)
	{
		logDebug("SUCCESS! in calling MiCars create Invoice Web Service " + mInvoice);

		var mInvoiceObject = JSON.parse(mInvoice);
		mInvoiceNumber = mInvoiceObject.invoiceNumber;
	}

	//Create MiCars Reference Data
	result = createMiCarsRef(mInvoiceNumber, inv[0]);
	if (result)
	{
		logDebug("SUCCESS! in calling MiCars create reference Web Service " + result);
	}

	//Update the feeitem UDF so we don't process it again
	updateFeeItemUDF(feeSeq, "MICARS", null, null, null);
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

	aa.print("Update MiCars Reference request body is " + requestBody);
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
function getCapAddresses()
{
	var itemCap = null;
	var result = null;

	if (arguments.length == 1)
	{
		itemCap = arguments[0];
	}
	else
	{
		itemCap = capId;
	}

	var capAddResult = aa.address.getAddressByCapId(capId);
	if (!capAddResult.getSuccess())
	{
		logDebug("Problem getting address for capid ".replace("capid", itemCap.getCusomtID()) + capAddResult.getErrorMessage());
		return false;
	}
	result = capAddResult.getOutput();
	return result;

}
function pushAutoAssessedFees2MiCars()
{
	var itemCap = capId;
	if (arguments.length > 0)
	{
		itemCap = arguments[1];
	}
	var feeItemsScriptResult = aa.finance.getFeeItemByCapID(capId);
	if (!feeItemsScriptResult.getSuccess())
	{
		logDebug("Problem getting fee items for $capid$ $error$".replace("$capid$", itemCap.getCustomID()).replace("$error$", feeItemsScriptResult.getErrorMessage()));
		return false;
	}
	var feeItems = feeItemsScriptResult.getOutput();
	for (var x in feeItems)
	{
		var thisFee = feeItems[x];
		var thisf4FeeItem = thisFee.getF4FeeItem();

		if (!"MICARS".equals(thisf4FeeItem.getUdf1()))
		{
			handleMiCars(thisf4FeeItem.getFeeSeqNbr());	
		}
	}
}
function updateFeeItemUDF(feeSeq, udf1, udf2, udf3, udf4)//optional capId
{
	var itemCap = null;
	if (arguments.length == 6)
	{
		itemCap = arguments[5];
	}
	else
	{
		itemCap = capId;
	}

	var feeItemScriptResult = aa.finance.getFeeItemByPK(capId, feeSeq);
	if (!feeItemScriptResult.getSuccess())
	{
		logDebug("Problem getting fee item for $capid$ $error$".replace("$capid", itemCap.getCustomID()).replace("$error$", feeItemScriptResult.getErrorMessage()));
		return false;
	}
	var feeItem = feeItemScriptResult.getOutput();
	var f4feeItem = feeItem.getF4FeeItem();

	if(udf1)
	{
		f4feeItem.setUdf1(udf1);
	}
	if(udf2)
	{
		f4feeItem.setUdf2(udf2);
	}
	if(udf3)
	{
		f4feeItem.setUdf3(udf3);
	}
	if(udf4)
	{
		f4feeItem.setUdf4(udf4);
	}

	var updateFeeScript = aa.finance.editFeeItem(f4feeItem);
	if(!updateFeeScript.getSuccess())
	{
		logDebug("Problem updating fee item for $capid$ $error$".replace("$capid", itemCap.getCustomID()).replace("$error$", feeItemScriptResult.getErrorMessage()));
		return false;
	}
	else
	{
		logDebug("Successfully updated fee item for $capid$".replace("$capid$", itemCap.getCustomID()))
		return true;
	}
}
/*
* NOTE: Pass null for parameter 'invScriptObject' to send the Renewal scenario to MiCars (Current Year for Invoice Number, $0 for Invoice Amount)
*/
function createMiCarsRef(mInvoiceNum, invScriptObject)
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
		logDebug("SUCCESS! in calling MiCars reference Web Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars reference web service " + r.getErrorMessage())
		return false;
	}
}
function pushMiCarsInvoice(feeSeq)
{
	//Variables
	var result = null;

	//Get Fee information
	var feeResult = aa.finance.getFeeItemByPK(capId, feeSeq);
	if (!feeResult.getSuccess())
	{
		logDebug("Problem getting fees for capid ".replace("capid", capId.getCustomID()) + feeResult.getErrorMessage());
		return false;
	}

	var fee = feeResult.getOutput();
	var f4fee =	fee.getF4FeeItem();

	var feesConfigSc = "MICARS_RECEIVABLES";
	var feeConfig = lookup(feesConfigSc, f4fee.getFeeCod());
	if (!feeConfig) return false;	

	//Get Program, Division and SKU
	var mDivision = feeConfig.split("/")[0];
	var mProgram = feeConfig.split("/")[1];
	var mSku = f4fee.getAccCodeL1();
	mSku = parseInt(mSku, 10);

	
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
	var uri = baseURL + "receivables";

	var time = epochTime();
	var nonce = newGuid();
	var method = "POST"
	var encodedUri = encodeURIComponent(uri).toLowerCase();
	var requestBody = "";
	var today = new Date();
	var month = parseInt(today.getMonth()) + 1;


	//Create JSON request body
	var pushInvJSON = new Object();
	pushInvJSON.AgencyCode = "791";
	pushInvJSON.Division = mDivision + "";
	pushInvJSON.Program = mProgram  + "";
	pushInvJSON.InvoiceCode = "FEE";
	pushInvJSON.FiscalYear = today.getFullYear() + "";
	pushInvJSON.accountId = capId.getCustomID() + "";

	pushInvJSON.InvoiceDate = today.getFullYear() + "-" + month + "-" + today.getDate();
	pushInvJSON.permitNumber = capId.getCustomID() + "";
	pushInvJSON.InterfaceType = "ACCELA";
	pushInvJSON.SKUNUMBER = mSku + "";
	pushInvJSON.Details = new Array();


	//Details
	var detatilsJSON = new Object();
	detatilsJSON.Description = fee.getFeeDescription() + "";
	detatilsJSON.Quantity = "1";
	detatilsJSON.UnitCost = fee.getFee() + "";
	detatilsJSON.TotalCost = fee.getFee() + "";
	detatilsJSON.SalesTax = "false";

	//push to JSON object
	pushInvJSON.Details.push(detatilsJSON);

	//Stringify
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
		logDebug("SUCCESS! in calling MiCars getCustomer Service");
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
////////////////////////////////////////////////////////////END MICARS FUNCTIONS//////////////////////////////////////////////////////////////////////////
function getPrimaryContact()
{
	var result = null;

	var thisCap = capId;
	if (arguments.length == 1) thisCap = arguments[0];

	var capContactResult = aa.people.getCapContactByCapID(thisCap);
	if (capContactResult.getSuccess())
	{
		contacts = capContactResult.getOutput();
		for (c in contacts)
		{
			thisContact = contacts[c];
			if(!"Y".equals(thisContact.getCapContactModel().getPrimaryFlag())) continue;

			var result = new Object();
			result.lastName = contacts[c].getPeople().lastName;
			result.refSeqNumber = contacts[c].getCapContactModel().getRefContactNumber();
			result.firstName = contacts[c].getPeople().firstName;
			result.middleName = contacts[c].getPeople().middleName;
			result.businessName = contacts[c].getPeople().businessName;
			result.contactType = contacts[c].getPeople().contactType;
			result.phone1 = contacts[c].getPeople().phone1;
			result.email = contacts[c].getPeople().email;
			result.addressLine1 = contacts[c].getPeople().getCompactAddress().getAddressLine1();
			result.addressLine2 = contacts[c].getPeople().getCompactAddress().getAddressLine2();
			result.city = contacts[c].getPeople().getCompactAddress().getCity();
			result.state = contacts[c].getPeople().getCompactAddress().getState();
			result.zip = contacts[c].getPeople().getCompactAddress().getZip();
			result.fax = contacts[c].getPeople().getCompactAddress().getCountry();
			result.fullName = contacts[c].getPeople().fullName;

			return result;

		}

	}
	else
	{
		logDebug("Problem trying to get contacts for capid ".replace("capid", thisCap.getCustomID()) + capContactResult.getErrorMessage());
		return null;
	}

return null;	
}
function logDebug(str){aa.print(str);}

function logMessage(str)
{
	aa.print(str);
}

function updateFeeItemInvoiceFlag(feeSeq,finvoice)
{
	if(feeSeq == null)
		return;
	if(publicUser && !cap.isCompleteCap())
	{
		var feeItemScript = aa.finance.getFeeItemByPK(capId,feeSeq);
		if(feeItemScript.getSuccess)
		{
			var feeItem = feeItemScript.getOutput().getF4FeeItem();
			feeItem.setAutoInvoiceFlag(finvoice);
			aa.finance.editFeeItem(feeItem);
		}
	}
}


function printMethods(object)
{
    for (x in object.getClass().getMethods())
    {
        aa.print(object.getClass().getMethods()[x].getName());
    }
}



function lookup(stdChoice,stdValue) 
	{
	var strControl;
	var bizDomScriptResult = aa.bizDomain.getBizDomainByValue(stdChoice,stdValue);
	
   	if (bizDomScriptResult.getSuccess())
   		{
		var bizDomScriptObj = bizDomScriptResult.getOutput();
		strControl = "" + bizDomScriptObj.getDescription(); // had to do this or it bombs.  who knows why?
		logDebug("lookup(" + stdChoice + "," + stdValue + ") = " + strControl);
		}
	else
		{
		logDebug("lookup(" + stdChoice + "," + stdValue + ") does not exist");
		}
	return strControl;
	}



function getScriptText(vScriptName, servProvCode, useProductScripts) {
	if (!servProvCode)  servProvCode = aa.getServiceProviderCode();
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	try {
		if (useProductScripts) {
			var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName);
		} else {
			var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(), vScriptName, "ADMIN");
		}
		return emseScript.getScriptText() + "";
	} catch (err) {
		return "";
	}
}



function getScriptText(vScriptName, servProvCode, useProductScripts) 
{
	if (!servProvCode)  servProvCode = aa.getServiceProviderCode();
	vScriptName = vScriptName.toUpperCase();
	var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
	try {
		if (useProductScripts) {
			var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName);
		} else {
			var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(), vScriptName, "ADMIN");
		}
		return emseScript.getScriptText() + "";
	} catch (err) {
		return "";
	}
}
function makePaymentProxy(itemCap, feeAmount, payMethod)
{ 

	var paymentModel = new com.accela.aa.finance.cashier.PaymentModel(); 
	payModel = new com.accela.aa.emse.dom.PaymentScriptModel(paymentModel, aa.getServiceProviderCode(), "ADMIN"); 
	payModel.setCapID(itemCap); 
	payModel.setPaymentMethod(payMethod);
	payModel.setCashierID("MiCars"); 
	payModel.setPaymentComment("MiCars Payment"); 
	var jsDate = new Date(); 
	var aDate = aa.date.parseDate(jsDate.getMonth()+1 + "/" + jsDate.getDate() + "/" + jsDate.getFullYear() + " " + jsDate.getHours() + ":" + jsDate.getMinutes()); 
	payModel.setPaymentDate(aDate); 
	payModel.setPaymentRefNbr("1"); 
	payModel.setPaymentAmount(feeAmount);

	var payNum = null; 
	var result; 
	var cashierBiz = aa.proxyInvoker.newInstance("com.accela.aa.finance.cashier.CashierBusiness").getOutput(); 
	var jDate = new java.util.Date(payModel.getPaymentDate().getEpochMilliseconds()); 


	paymentModel = new com.accela.aa.finance.cashier.PaymentModel(); 
	paymentModel.setCapID(payModel.getCapID()); 
	paymentModel.setPaymentMethod(payModel.getPaymentMethod()); 
	paymentModel.setPaymentRefNbr(payModel.getPaymentRefNbr()); 
	paymentModel.setCcType(payModel.getCcType()); 
	paymentModel.setCcExpDate(payModel.getCcExpDate()); 
	paymentModel.setPayee(payModel.getPayee()); 
	paymentModel.setPaymentDate(jDate); 
	paymentModel.setPaymentAmount(payModel.getPaymentAmount()); 
	paymentModel.setPaymentChange(payModel.getPaymentChange()); 
	paymentModel.setAmountNotAllocated(payModel.getPaymentAmount()); 
	paymentModel.setPaymentStatus(payModel.getPaymentStatus()); 
	paymentModel.setCashierID(payModel.getCashierID()); 
	paymentModel.setRegisterNbr(payModel.getRegisterNbr()); 
	paymentModel.setPaymentComment(payModel.getPaymentComment()); 
	paymentModel.setAuditID("ADMIN"); 
	paymentModel.setPaymentStatus("Paid"); 
	paymentModel.setReceivedType(payModel.getReceivedType()); 
	try
	{ 
		var payNum = cashierBiz.makePayment(paymentModel); 
		logDebug("Made payment: "+payNum); 
		result = new com.accela.aa.emse.dom.ScriptResult(true, "Payment Exception", "", payNum); 
	} 
	catch(err)
	{ 
		logDebug("Failed to make payment: " + err); 
		result = new com.accela.aa.emse.dom.ScriptResult(false, "Payment Exception", err, ""); 
	} 
	return result; 
} 

 function getContactByType(conType,capId) {

    var contactArray = getPeople(capId);



    for(thisContact in contactArray) {

        if((contactArray[thisContact].getPeople().contactType).toUpperCase() == conType.toUpperCase())

            return contactArray[thisContact].getPeople();

    }



    return false;

}

function getContactArray()
	{
	// Returns an array of associative arrays with contact attributes.  Attributes are UPPER CASE
	// optional capid
	// added check for ApplicationSubmitAfter event since the contactsgroup array is only on pageflow,
	// on ASA it should still be pulled normal way even though still partial cap
	var thisCap = capId;
	if (arguments.length == 1) thisCap = arguments[0];

	var cArray = new Array();

	if (arguments.length == 0 && !cap.isCompleteCap() && controlString != "ApplicationSubmitAfter") // we are in a page flow script so use the capModel to get contacts
		{
		capContactArray = cap.getContactsGroup().toArray() ;
		}
	else
		{
		var capContactResult = aa.people.getCapContactByCapID(thisCap);
		if (capContactResult.getSuccess())
			{
			var capContactArray = capContactResult.getOutput();
			}
		}

	if (capContactArray)
		{
		for (yy in capContactArray)
			{
			var aArray = new Array();
			aArray["lastName"] = capContactArray[yy].getPeople().lastName;
			aArray["refSeqNumber"] = capContactArray[yy].getCapContactModel().getRefContactNumber();
			aArray["firstName"] = capContactArray[yy].getPeople().firstName;
			aArray["middleName"] = capContactArray[yy].getPeople().middleName;
			aArray["businessName"] = capContactArray[yy].getPeople().businessName;
			aArray["contactSeqNumber"] =capContactArray[yy].getPeople().contactSeqNumber;
			aArray["contactType"] =capContactArray[yy].getPeople().contactType;
			aArray["relation"] = capContactArray[yy].getPeople().relation;
			aArray["phone1"] = capContactArray[yy].getPeople().phone1;
			aArray["phone2"] = capContactArray[yy].getPeople().phone2;
			aArray["email"] = capContactArray[yy].getPeople().email;
			aArray["addressLine1"] = capContactArray[yy].getPeople().getCompactAddress().getAddressLine1();
			aArray["addressLine2"] = capContactArray[yy].getPeople().getCompactAddress().getAddressLine2();
			aArray["city"] = capContactArray[yy].getPeople().getCompactAddress().getCity();
			aArray["state"] = capContactArray[yy].getPeople().getCompactAddress().getState();
			aArray["zip"] = capContactArray[yy].getPeople().getCompactAddress().getZip();
			aArray["fax"] = capContactArray[yy].getPeople().fax;
			aArray["notes"] = capContactArray[yy].getPeople().notes;
			aArray["country"] = capContactArray[yy].getPeople().getCompactAddress().getCountry();
			aArray["fullName"] = capContactArray[yy].getPeople().fullName;
			aArray["peopleModel"] = capContactArray[yy].getPeople();

			var pa = new Array();

			if (arguments.length == 0 && !cap.isCompleteCap()) {
				var paR = capContactArray[yy].getPeople().getAttributes();
				if (paR) pa = paR.toArray();
				}
			else
				var pa = capContactArray[yy].getCapContactModel().getPeople().getAttributes().toArray();
	                for (xx1 in pa)
                   		aArray[pa[xx1].attributeName] = pa[xx1].attributeValue;

        	cArray.push(aArray);
			}
		}
	return cArray;
	}
function getPeople(capId)
{
	capPeopleArr = null;
	var s_result = aa.people.getCapContactByCapID(capId);
	if(s_result.getSuccess())
	{
		capPeopleArr = s_result.getOutput();
		if(capPeopleArr != null || capPeopleArr.length > 0)
		{
			for (loopk in capPeopleArr)	
			{
				var capContactScriptModel = capPeopleArr[loopk];
				var capContactModel = capContactScriptModel.getCapContactModel();
				var peopleModel = capContactScriptModel.getPeople();
				var contactAddressrs = aa.address.getContactAddressListByCapContact(capContactModel);
				if (contactAddressrs.getSuccess())
				{
					var contactAddressModelArr = convertContactAddressModelArr(contactAddressrs.getOutput());
					peopleModel.setContactAddressList(contactAddressModelArr);    
				}
			}
		}
		else
		{
			aa.print("WARNING: no People on this CAP:" + capId);
			capPeopleArr = null;
		}
	}
	else
	{
		aa.print("ERROR: Failed to People: " + s_result.getErrorMessage());
		capPeopleArr = null;	
	}
	return capPeopleArr;
}
 function convertContactAddressModelArr(contactAddressScriptModelArr)
{
	var contactAddressModelArr = null;
	if(contactAddressScriptModelArr != null && contactAddressScriptModelArr.length > 0)
	{
		contactAddressModelArr = aa.util.newArrayList();
		for(loopk in contactAddressScriptModelArr)
		{
			contactAddressModelArr.add(contactAddressScriptModelArr[loopk].getContactAddressModel());
		}
	}	
	return contactAddressModelArr;
}
function printMethodsWithValues(object) {

    for (x in object.getClass().getMethods()) {
        var method = object.getClass().getMethods()[x];
        var methodName = method.getName();
        aa.print(methodName  + ": " + propertyValueFromName(object, methodName));
    }
}

function propertyValueFromName(object, methodName) {
    var lengthValue = (methodName + "").length;
    if (methodName.indexOf("get") == 0 && lengthValue > 3) {
        var propertyName = methodName.substr(3, 1).toLowerCase() + methodName.substr(4);
         return object[propertyName];
    } else {
        return "";
    }
}