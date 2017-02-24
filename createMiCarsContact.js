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
		logDebug("SUCCESS! in calling MiCars createCustomer Web Service");
		return r.getOutput();
	}
	else
	{
		logDebug("FAILED to call MiCars createCustomer web service " + r.getErrorMessage())
		return null;
	}
}