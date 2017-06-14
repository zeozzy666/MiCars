try{
if ("CEPAS (manual)".equals(PaymentMethod))
{
	FeeSeqList = FeeSeqList + "";
	var feeSeq = FeeSeqList.substring(1, FeeSeqList.length -1);
	feeSeq = feeSeq.split("|");
	aa.print(feeSeq);

	for (var f in feeSeq)
	{
		//Get Invoice
		var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeSeq[f], aa.util.newQueryFormat());
		if (!inv.getSuccess())
		{
			logDebug("Problem getting invoice for cap $capid$".replace("$capid$", capId.getCustomID()));
			logDebug(inv.getErrorMessage());
		}
		if (inv.getOutput().length == 0)
		{
			logDebug("Getting invoice successful but length is zero");
		}

		inv = inv.getOutput();
		for (var i in inv)
		{
			var invNum = inv[i].getInvoiceNbr();
			voidMiCarsInvoice(capId.getCustomID(), invNum, null, "Paid through CEPAS");
		}
	}

}
}catch (err) {
    logDebug("A JavaScript Error occurred: " + err.message);
}	