useAppSpecificGroupName = false;
showDebug = 3;
SCRIPT_VERSION = "3.0";
//Include MiCars functions
eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", null, false));
eval(getScriptText("INCLUDES_ACCELA_GLOBALS", null, false));
eval(getScriptText("INCLUDES_CUSTOM", null, false));

capId = aa.cap.getCapID("FODR-016166").getOutput();

//Get MiCars payments
/*------------------------------------------------------------------------------------------------------/
| Script Name	: CTRCA:Licenses/-/-/Renewal
| Event   		: Convert to real cap afteer
| Description   : Gets payment from MiCars and applies payments to corresponding Accela renewal Records
| Author: Fouad Ishac - fishac@accela.com
| Date: 03/31/2017
/------------------------------------------------------------------------------------------------------*/
//Variables
var lookBackDays = 10;
//


//eval(getScriptText("MICARS_FUNCTIONS", null, false));

//Get look back days
var toDate = new Date();
var fromDate = new Date();
fromDate.setDate(toDate.getDate() - lookBackDays);
var restFromDate = fromDate.getFullYear() + "-" + ('0' + (fromDate.getMonth()+1)).slice(-2) + "-" + ('0' + fromDate.getDate()).slice(-2);
var restToDate = toDate.getFullYear() + "-" + ('0' + (toDate.getMonth()+1)).slice(-2) + "-" + ('0' + toDate.getDate()).slice(-2);
var recDate = null;
var controlNumber = null;
var entryNumber = null;
var date = getAppSpecific("MICARS_DATE");
if (date)
{
	var manualDate = new Date(date);
	restFromDate = manualDate.getFullYear() + "-" + ('0' + (manualDate.getMonth()+1)).slice(-2) + "-" + ('0' + manualDate.getDate()).slice(-2);
	restToDate = manualDate.getFullYear() + "-" + ('0' + (manualDate.getMonth()+1)).slice(-2) + "-" + ('0' + manualDate.getDate()).slice(-2);	
}
aa.print("Getting revenue from $fromdate$ to $todate$".replace("$fromdate$", restFromDate).replace("$todate$", restToDate));


//Get revenue
var json = getRevenue(restFromDate, restToDate);

if (json)
{
	aa.print("**MiCarsINFO** SUCCESS! in calling getRevenue Web Service");
	json = JSON.parse(json);
}

if (json)
{
	for (var r in json.Receipts)
	{
		var recDate = json.Receipts[r].ReceiptDate + "";
		var controlNumber = json.Receipts[r].ControlNumber + "";
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
			var thisCapId = null;
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
					aa.print("**MiCarsINFO** SUCCESS! in calling getMiCarsRefData with result " + "getRefResult");
					var refData = JSON.parse(getRefResult);
					if(!refData[0]) 
					{
						aa.print("**MICARSINFO** getMiCarsRefData did not return any results now skipping");
						continue;
					}
					var refId = refData[0].ReferenceId;
					if (refId)
					{
						populateCapIDandInvoiceNumber(refId);
					}
				}
			}
			//prepare payment
			//create paymentscriptmodel
			if (thisCapId)
			{
				//variables
				payCap = getRenewalChild(thisCapId);
				if (!payCap)
				{
					aa.print("Could not find renewal cap for " + thisCapId.getCustomID());
					continue;
				}
				//have to get capId again because getRenewalChild() does not return a complete capId
				payCap = aa.cap.getCapID(payCap.getID1(), payCap.getID2(), payCap.getID3()).getOutput();

				//if current record is not equal to the record we are processing then this is not the right payment
				if (payCap.getCustomID() != capId.getCustomID())
				{
					aa.print("Skipping applying payment to $paycap$ because it's not equal $capid$".replace("$paycap$", payCap.getCustomID()).replace("$capid$", capId.getCustomID()));
					continue;
				}

				aa.print("Checking to see if payment exists on this cap");
				var paymentsSR = aa.finance.getPaymentByCapID(payCap, aa.util.newQueryFormat());
				if (!paymentsSR.getSuccess())
				{
					aa.print("Problem getting payments for capid ".replace("capid", payCap.getCustomID()) + paymentsSR.getErrorMessage());
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
						aa.print("Payment already applied to capid with MiCars control number cnumber, skipping".replace("capid", payCap.getCustomID()).replace("cnumber", controlNumber));
						continue;
					}
					aa.print("Got remmittance for $capid$ now creating payment for $amount$".replace("$capid$", payCap.getCustomID()).replace("$amount$", doc.Amount));
					var pID = makePaymentProxy(payCap, doc.Amount, "ASC").getOutput();

					//Update UDF
					var updateResult = aa.cashier.editPaymentUDFAndReceivedType(payCap, parseInt(pID), controlNumber, "", "", "", "");
					if (updateResult.getSuccess())
					{
						aa.print("Successfully update UDF1 for payment with MiCars Control number cnum".replace("cnum", controlNumber));
					}
					else
					{
						aa.print("Problem updating payment UDF " + updateResult.getErrorMessage());
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
			else
			{
				continue;
			}				
		}
	}	
}
else
{
	aa.print("Did not retrieve revenue");
}
function getRenewalChild(itemCap)
{
	//get renewal child records
	var result = aa.cap.getProjectByMasterID(itemCap, "Renewal", null);

	if (result.getSuccess())
	{
		aa.print("Successfully retrieved count renewal child records for capid".replace("count", result.getOutput().length).replace("capid", itemCap.getCustomID()));

		var renewalCaps = result.getOutput();

		//Loop through and find an in progress renewal
		for  (var r in renewalCaps)
		{
			var renewCapId = renewalCaps[r].getCapID();
			var thisCap = aa.cap.getCap(renewCapId).getOutput();
			var status = thisCap.getCapStatus();
			var thisCapDetail = aa.cap.getCapDetail(renewCapId).getOutput();
			var balance = thisCapDetail.getBalance();

			if (balance > 0 && (!"Issued".equals(status)))
			{
				return renewCapId;
			}

		}
	}
	else
	{
		aa.print("Problem retrieving renewal child caps " + result.getErrorMessage());
		return false;
	}

	return false;
}
function populateCapIDandInvoiceNumber(miCarsReferenceID)
{
	var renewalFlagArray = miCarsReferenceID.split("/R");
	if (renewalFlagArray.length > 1)
	{
		isRenewal = true;
		altId = renewalFlagArray[0];
	}
	if (altId)
	{
		thisCapId = aa.cap.getCapID(altId).getOutput();
	}
	if (!thisCapId)
	{
		aa.print("Received remmittance for $capid$ but record cannot be found in Accela".replace("$capid$", doc.InterfaceId1));
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
		aa.print("Made payment: "+payNum); 
		result = new com.accela.aa.emse.dom.ScriptResult(true, "Payment Exception", "", payNum); 
	} 
	catch(err)
	{ 
		aa.print("Failed to make payment: " + err); 
		result = new com.accela.aa.emse.dom.ScriptResult(false, "Payment Exception", err, ""); 
	} 
	return result; 
} 


function applyPayments() {
	var invNumber = null;
	if (arguments.length == 1)
	{
		invNumber = arguments[0];
	}

	var payResult = aa.finance.getPaymentByCapID(capId, null)

		if (!payResult.getSuccess()) {
			aa.print("**ERROR: error retrieving payments " + payResult.getErrorMessage());
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
			aa.print("**ERROR: error retrieving fee items " + feeResult.getErrorMessage());
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
				aa.print("**ERROR: error retrieving fee payment items items " + pfResult.getErrorMessage());
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
				aa.print("**ERROR: error retrieving invoice items " + invoiceResult.getErrorMessage());
				return false
			}

			var invoiceItem = invoiceResult.getOutput();

			// Should return only one invoice number per fee item

			if (invoiceItem.length != 1) {
				aa.print("**WARNING: fee item " + feeItem.getFeeSeqNbr() + " returned " + invoiceItem.length + " invoice matches")
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
					aa.print("Applied $" + fpaylist[0] + " to fee code " + feeItem.getFeeCod() + ".  Payment Balance: $" + payBalance);
				} else {
					aa.print("**ERROR: error applying payment " + applyResult.getErrorMessage());
					return false
				}
			}

			if (payBalance <= 0)
				break;
		}
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
function getAppSpecific(itemName)  // optional: itemCap
{
	var updated = false;
	var i=0;
	var itemCap = capId;
	if (arguments.length == 2) itemCap = arguments[1]; // use cap ID specified in args
   	
	if (useAppSpecificGroupName)
	{
		if (itemName.indexOf(".") < 0)
			{ aa.print("**WARNING: editAppSpecific requires group name prefix when useAppSpecificGroupName is true") ; return false }
		
		
		var itemGroup = itemName.substr(0,itemName.indexOf("."));
		var itemName = itemName.substr(itemName.indexOf(".")+1);
	}
	
    var appSpecInfoResult = aa.appSpecificInfo.getByCapID(itemCap);
	if (appSpecInfoResult.getSuccess())
 	{
		var appspecObj = appSpecInfoResult.getOutput();
		
		if (itemName != "")
		{
			for (i in appspecObj)
				if( appspecObj[i].getCheckboxDesc() == itemName && (!useAppSpecificGroupName || appspecObj[i].getCheckboxType() == itemGroup) )
				{
					return appspecObj[i].getChecklistComment();
					break;
				}
		} // item name blank
	} 
	else
		{ aa.print( "**ERROR: getting app specific info for Cap : " + appSpecInfoResult.getErrorMessage()) }
}
