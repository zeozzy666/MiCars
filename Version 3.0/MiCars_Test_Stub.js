/////////////////////////////////////////////////////////////////MICARS FUNCTIONS//////////////////////////////////////////////////////////////////////////////////
eval(getScriptText("MICARS_FUNCTIONS", null, false));
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

capId = aa.cap.getCapID("NURDL-200558").getOutput();
cap = aa.cap.getCap(capId).getOutput();
feeSeqList = new Array();
paymentPeriodList = new Array();
publicUser = false;
contactArray = getContactArray();
//pushAutoAssessedFees2MiCars();
//feeSeq = addFee("NUR_MILE","NURSERY INSPECTION FEES","FINAL",1,"Y", capId);
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
var FeeItemSeqNbrArray = new Array();
FeeItemSeqNbrArray.push("18616619");
FeeItemSeqNbrArray.push("18616620");
//r = handleMiCars(FeeItemSeqNbrArray);
//var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, FeeItemSeqNbrArray[0], aa.util.newQueryFormat()).getOutput();
//var invNum = inv[0].getInvoiceNbr();
//tAmount = aa.finance.getInvoiceAmountExceptVoidCredited(capId, invNum).getOutput();
//aa.print(aa.finance.getInvoiceByCapID)
//r = voidMiCarsInvoice(null, null, "10086359");
//aa.print(tAmount);


var fees = aa.finance.getFeeItemByCapID(capId).getOutput();
for (var x in fees)
{
	//r = pushMiCarsInvoice(fees[x].getF4FeeItem().getFeeSeqNbr());
	var a = new Array();
	a.push(fees[x].getF4FeeItem().getFeeSeqNbr());
}
var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, a[0], aa.util.newQueryFormat()).getOutput();
var invNum = inv[0].getInvoiceNbr();
//handleMiCars(a);
r = voidMiCarsInvoice(capId.getCustomID(), invNum, null);
aa.print(r);


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