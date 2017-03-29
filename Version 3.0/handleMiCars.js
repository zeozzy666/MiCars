function handleMiCars(feeSeqArray)
{
  //Variables
  var mInvoice = null;
  var result = null;
  var mInvoiceNumber = null;

  //Get Invoice
  var inv = aa.finance.getFeeItemInvoiceByFeeNbr(capId, feeSeqArray[0], aa.util.newQueryFormat());
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
  var contMiCars = null;
  if(contactJSON)
  {
    logDebug("**MiCarsINFO** SUCCESS! in calling getMiCarsCustomer, response for  " + capId.getCustomID() + " " +  contactJSON);
    contMiCars = JSON.parse(contactJSON);
  }
  
  if(!contMiCars || !contMiCars.AccountId || contMiCars.AccountId == 0)
  {
    //get address
    var addresses = getCapAddresses();
    //Get Business Contact
    var bizContact = getContactByType("Business", capId);
    //createa micars contact
    var miCarsCont = createMiCarsContact(bizContact, addresses[0], capId.getCustomID());
    if (miCarsCont)
    {
      logDebug("**MiCarsINFO** SUCCESS! in calling createMiCarsContact, response for " + capId.getCustomID() + " " + miCarsCont);
    }
  }
  mInvoice = pushMiCarsInvoice(feeSeqArray);

  //Get MiCars Invoice Number
  if (mInvoice)
  {
    logDebug("**MiCarsINFO** SUCCESS! in calling pushMiCarsInvoice, reponse for  " + capId.getCustomID() + " "  + mInvoice);

    var mInvoiceObject = JSON.parse(mInvoice);
    mInvoiceNumber = mInvoiceObject.invoiceNumber;
  }

  //Create MiCars Reference Data
  result = createMiCarsRef(mInvoiceNumber, inv[0]);
  if (result)
  {
    logDebug("**MiCarsINFO** SUCCESS! in calling createMiCarsRef, response for " + capId.getCustomID() + " " + result);
    //Update the feeitem UDF so we don't process it again
    for (f2 in feeSeqArray)
    {
      updateFeeItemUDF(feeSeqArray[f2], "MICARS", null, null, null);
    }
  }
}