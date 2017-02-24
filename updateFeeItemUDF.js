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