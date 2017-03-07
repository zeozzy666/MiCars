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