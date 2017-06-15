/*------------------------------------------------------------------------------------------------------/
| Script Name	: MICARS_GET_REVENUE
| Event   		: Batch
| Description   : Gets payment from MiCars and applies payments to corresponding Accela Records
| Author: Fouad Ishac - fishac@accela.com
| Date: 02/01/2017
/------------------------------------------------------------------------------------------------------*/
//Testing
//aa.env.setValue("lookBackDays", 1);
//

//Include MiCars functions
eval(getScriptText("MICARS_FUNCTIONS", null, false));

//Get look back days
var lookBackDays = aa.env.getValue("lookBackDays");
var toDate = new Date();
var fromDate = new Date();
fromDate.setDate(toDate.getDate() - lookBackDays);
aa.print(fromDate)
var restFromDate = fromDate.getFullYear() + "-" + ('0' + (fromDate.getMonth()+1)).slice(-2) + "-" + ('0' + fromDate.getDate()).slice(-2);
var restToDate = toDate.getFullYear() + "-" + ('0' + (toDate.getMonth()+1)).slice(-2) + "-" + ('0' + toDate.getDate()).slice(-2);
var recDate = null;
var controlNumber = null;
var entryNumber = null;

logDebug("Getting revenue from $fromdate$ to $todate$".replace("$fromdate$", restFromDate).replace("$todate$", restToDate));


//Get revenue
var json = getRevenue(restFromDate, restToDate);

if (json)
{
	logDebug("**MiCarsINFO** SUCCESS! in calling getRevenue Web Service with response " + "json");
	json = JSON.parse(json);
}

if (json)
{
	for (var r in json.Receipts)
	{
		var recDate = json.Receipts[r].ReceiptDate;
		controlNumber = json.Receipts[r].ControlNumber + "";
		var jsrecDate = null;
		//Lets format the date
		if (recDate)
		{
			recDate = recDate.split("T")[0].replace("-", "/");
			jsrecDate = new Date(recDate).getTime();
		}

		for (var d in json.Receipts[r].Documents)
		{
			//Variables
			var altId = null;
			var invcNum = null;
			var capId = null;
			entryNumber = json.Receipts[r].Documents[d].EntryNumber;

			var doc = json.Receipts[r].Documents[d];
			if (doc.InterfaceId1) 
			{
				populateCapIDandInvoiceNumber(doc.InterfaceId1);
			}
			else if (doc.InvoiceNumber)
			{
				//variables
				var getRefResult = null;
				var mInvoiceNumber = doc.InvoiceNumber;

				//call MiCars web service
				getRefResult = getMiCarsRefData(null, null, mInvoiceNumber);

				if(getRefResult)
				{
					logDebug("**MiCarsINFO** SUCCESS! in calling getMiCarsRefData with result " + "getRefResult");
					var refData = JSON.parse(getRefResult);
					if(!refData[0]) 
					{
						logDebug("**MICARSINFO** getMiCarsRefData did not return any results now skipping");
						continue;
					}
					var refId = refData[0].ReferenceId;
					invcNum = refData[0].InvoiceNumber;
					if (refId)
					{
						populateCapIDandInvoiceNumber(refId);
					}
				}
			}
			//prepare payment
			//create paymentscriptmodel
			if (capId)
			{
				//variables
				var payCap = capId;
				logDebug("Checking to see if payment exists on this cap");
				var paymentsSR = aa.finance.getPaymentByCapID(payCap, aa.util.newQueryFormat());
				if (!paymentsSR.getSuccess())
				{
					logDebug("Problem getting payments for capid ".replace("capid", payCap.getCustomID()) + paymentsSR.getErrorMessage());
				}
				else
				{
					var payments =  paymentsSR.getOutput();
					var found = false;
					for (var p in payments)
					{
						var thisPayment = payments[p];
						var checkMe = controlNumber + "-" + entryNumber;
						//printMethods(thisPayment);
						if (checkMe.equals(thisPayment.getUdf1()))
						{
							found = true;
							break;
						}
					}
					if (found)
					{
						logDebug("Payment already applied to capid with MiCars control number cnumber and entry number enumber, skipping".replace("capid", payCap.getCustomID()).replace("cnumber", controlNumber).replace("enumber", entryNumber));
						continue;
					}
					logDebug("Got remmittance for $capid$ now creating payment for $amount$".replace("$capid$", payCap.getCustomID()).replace("$amount$", doc.Amount));
					var pID = makePaymentProxy(payCap, doc.Amount, "ASC").getOutput();

					//Update UDF
					var updateResult = aa.cashier.editPaymentUDFAndReceivedType(payCap, parseInt(pID), controlNumber + "-" + entryNumber, "", "", "", "");
					if (updateResult.getSuccess())
					{
						logDebug("Successfully update UDF1 for payment with MiCars Control number cnum".replace("cnum", controlNumber));
					}
					else
					{
						logDebug("Problem updating payment UDF " + updateResult.getErrorMessage());
					}
					if (invcNum)
					{
						applyPayments(invcNum);
					}
					else
					{
						applyPayments();
					}					
				}

			}					
		}
	}	
}
else
{
	logDebug("Did not retrieve revenue");
}
function populateCapIDandInvoiceNumber(miCarsReferenceID)
{
	var tempArray = miCarsReferenceID.split("--");
	
	if (tempArray.length > 1)
	{
		altId = tempArray[0];
		invcNum = tempArray[1];
	}
	else if (tempArray.length == 1)
	{
		altId = tempArray[0];
	}

	if (altId)
	{
		capId = aa.cap.getCapID(altId).getOutput();
	}
	
	if (!capId)
	{
		logDebug("Received remmittance for $capid$ but record cannot be found in Accela".replace("$capid$", doc.InterfaceId1));
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
	payModel.setPaymentRefNbr(controlNumber); 
	payModel.setPaymentAmount(feeAmount);

	var payNum = null; 
	var result; 
	var cashierBiz = aa.proxyInvoker.newInstance("com.accela.aa.finance.cashier.CashierBusiness").getOutput(); 
	var jDate = (!jsrecDate) ?  new java.util.Date(payModel.getPaymentDate().getEpochMilliseconds()) : jsrecDate;


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


function logDebug(str)
{
	aa.print(str);
}

function printJSON(object)
{
for(var key in object) {
    var value = object[key];
    aa.print("$key$: $value$".replace("$key$", key).replace("$value$", value));
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



function applyPayments() {
	var invNumber = null;
	if (arguments.length == 1)
	{
		invNumber = arguments[0];
	}

	var payResult = aa.finance.getPaymentByCapID(capId, null)

		if (!payResult.getSuccess()) {
			logDebug("**ERROR: error retrieving payments " + payResult.getErrorMessage());
			return false
		}

		var payments = payResult.getOutput();

	for (var paynum in payments) {
		var payment = payments[paynum];

		var payBalance = payment.getAmountNotAllocated();
		var payStatus = payment.getPaymentStatus();

		if (payBalance <= 0)
			continue; // nothing to allocate

		if (payStatus != "Paid")
			continue; // not in paid status

		var feeResult = aa.finance.getFeeItemByCapID(capId);

		if (!feeResult.getSuccess()) {
			logDebug("**ERROR: error retrieving fee items " + feeResult.getErrorMessage());
			return false
		}

		var feeArray = feeResult.getOutput();

		for (var feeNumber in feeArray) {

			var feeItem = feeArray[feeNumber];
			var amtPaid = 0;
			var pfResult = aa.finance.getPaymentFeeItems(capId, null);

			if (feeItem.getFeeitemStatus() != "INVOICED")
				continue; // only apply to invoiced fees

			if (!pfResult.getSuccess()) {
				logDebug("**ERROR: error retrieving fee payment items items " + pfResult.getErrorMessage());
				return false
			}

			var pfObj = pfResult.getOutput();

			for (ij in pfObj)
				if (feeItem.getFeeSeqNbr() == pfObj[ij].getFeeSeqNbr())
					amtPaid += pfObj[ij].getFeeAllocation()

					var feeBalance = feeItem.getFee() - amtPaid;

			if (feeBalance <= 0)
				continue; // this fee has no balance

			var fseqlist = new Array();
			var finvlist = new Array();
			var fpaylist = new Array();

			var invoiceResult = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeItem.getFeeSeqNbr(), null);

			if (!invoiceResult.getSuccess()) {
				logDebug("**ERROR: error retrieving invoice items " + invoiceResult.getErrorMessage());
				return false
			}

			var invoiceItem = invoiceResult.getOutput();

			// Should return only one invoice number per fee item

			if (invoiceItem.length != 1) {
				logDebug("**WARNING: fee item " + feeItem.getFeeSeqNbr() + " returned " + invoiceItem.length + " invoice matches")
			} else {
				if (invcNum && invoiceItem[0].getInvoiceNbr() != invcNum) continue;

				fseqlist.push(feeItem.getFeeSeqNbr());
				finvlist.push(invoiceItem[0].getInvoiceNbr());

				if (feeBalance > payBalance)
					fpaylist.push(payBalance);
				else
					fpaylist.push(feeBalance);

				applyResult = aa.finance.applyPayment(capId, payment, fseqlist, finvlist, fpaylist, "NA", "NA", "0");

				if (applyResult.getSuccess()) {
					payBalance = payBalance - fpaylist[0];
					logDebug("Applied $" + fpaylist[0] + " to fee code " + feeItem.getFeeCod() + ".  Payment Balance: $" + payBalance);
				} else {
					logDebug("**ERROR: error applying payment " + applyResult.getErrorMessage());
					return false
				}
			}

			if (payBalance <= 0)
				break;
		}
	}
}