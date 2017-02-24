function activateCustomFees()
{
	//get feeitems on current record
	var feeItems = aa.finance.getFeeItemByCapID(capId).getOutput();
	//Loop through each feeitem
	for (var x in feeItems)
	{
		var thisFee = feeItems[x].getF4FeeItem();
		//if not flagged as processed then remove and re-add
		if (!"CUSTOM".equals(thisFee.getUdf1()) && "NEW".equals(thisFee.getFeeitemStatus().toUpperCase()) && "FEE_MULTIPLIER".equals(thisFee.getFeeCalcProc()))
		{			
			logDebug("Updating custom fee feeCode with DSD formula...".replace("feeCode", thisFee.getFeeCod()));
			var customFeeAmount = getDSDCustomFeeAmount(thisFee.getFeeCod(), thisFee.getFeeSchudle(), thisFee.getVersion(), thisFee.getFeeUnit(), thisFee.getPaymentPeriod(), thisFee.getFormula());

			if(customFeeAmount)
			{
				//Set the new fee amount
				thisFee.setFee(customFeeAmount);
				//change it to a regular fee item
				//thisFee.setFeeCalcProc("CONSTANT");
				//Flag it so we dont process it again
				thisFee.setUdf1("CUSTOM");

				var updateResult = aa.finance.editFeeItem(thisFee);
				if (updateResult.getSuccess())
				{
					logDebug("Successfully updated feeitem to DSD Custom Fee".replace("feeitem", thisFee.getFeeCod()));
				}
				else
				{
					logDebug("Problem updating feeitem ".replace("feeitem", thisFee.getFeeCod()) + updateResult.getErrorMessage());
				}
			}
		}

	}

}