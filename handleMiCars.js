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