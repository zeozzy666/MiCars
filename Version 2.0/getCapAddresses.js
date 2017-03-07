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