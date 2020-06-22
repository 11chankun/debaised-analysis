
//json object that contains all aspects and table's data
/*
 * TODO - change of key names for :
 * rowRange as tableMetaData
 * k as limit
 */
  
var JsonObj = {
  'intent': 'null',
  'table': 'null',
  'rowRange': 'null',
  'metric': 'null',
  'dimensions': 'null',
  'summaryOperator': 'null',
  'isAsc': 'null',
  'k': 'null',
  'slices': 'null',
  'dateRange': 'null',
  'timeGranularity': 'null'
}


/*
 * function to set keys of JsonObj, called from client side javascript
 * call gcp function to obtain results and process them
 * return results to client side javascript function 
 */
function evalQuery(intent,metric,summaryOperator,isAsc,k,dimensions,slices,dateRange,timeGranularity) {

  /*
   * set intent 
   * JsonObj.intent is a string storing intent name
   */
  JsonObj.intent = intent;
  
  /*
   * set table and rowRange
   * JsonObj.table is a 2d array consisting of sheet's data
   */
  JsonObj.table = getTable();
  
  /*
   * set metric
   * JsonObj.metric is a string storing column name
   */
  JsonObj.metric = metric;
  
  /*
   * set dimension
   * JsonObj.dimensions is a 1d array of strings storing name of output columns
   */
  if(dimensions.length > 0)
    JsonObj.dimensions = dimensions;
  
  /*
   * set summary
   * JsonObj.summaryOperator is a string storing the name of operation to be applied
   */
  JsonObj.summaryOperator = summaryOperator;
  
  /* 
   * set sortOrder
   * JsonObj.isAsc is a boolean variable which stores true for ascending order
   */
  JsonObj.isAsc = isAsc;
  
  /* 
   * set limit
   * JsonObj.k is an Integer storing K 
   * (if user doesn't specify values of k -5000000 default)
   */
  JsonObj.k = k;
   
  /*
   * set slice
   * JsonObj.slices is a 1d array of objects
   * each object has 3 keys - sliceCol, sliceOp, sliceVal
   * sliceCol is a string, sliceOp is a string, sliceVal is 1d array of strings
   */
  if(slices.length > 0)
    JsonObj.slices = slices;
   
  /*
   * set dateRange
   * JsonObj.dateRange is an object with 3 keys - dateCol, dateStart, dateEnd
   * dateCol is a string, dateStart and dateEnd are dates (yyyy-mm-dd) 
   */
  if(dateRange.dateCol !== '' && dateRange.dateStart !== '' && dateRange.dateEnd !== '') {
    dateRange.dateStart = new Date(dateRange.dateStart);
    dateRange.dateEnd = new Date(dateRange.dateEnd);
    JsonObj.dateRange=dateRange;
    //formatDate(dateRange.dateCol);
  }
    
  /*
   * set timeGranularity
   * JsonObj.timeGranularity is a string containing the selected value
   */
  JsonObj.timeGranularity = timeGranularity;
  
  //printing the JsonObj
  Logger.log("JsonObj");
  Logger.log(JsonObj);

  //printing JsonObj in json format
  Logger.log("JsonObj in json format");
  Logger.log(JSON.stringify(JsonObj));
  var jsonQuery = JSON.stringify(JsonObj);
  
  //calling GCP function
  var outputQuery = callGcpFunc(JSON.stringify(JsonObj));
  var outputTable = outputQuery["outputTable"];
  var suggestions = outputQuery["suggestions"];
  Logger.log("output table ",outputTable);
  Logger.log("suggestions ",suggestions);
  
  //converting date from json into javascript date object
  outputTable = formatDate(outputTable);
  Logger.log("after processing date output table");
  Logger.log(outputTable);

  //array container the query's json values and output of query
  var query = [jsonQuery,outputQuery];
  Logger.log("array sent to client side js with json format of intent and output of gcp");
  Logger.log(query);
  return query;
  
}

//function to get the table data and set rowRange of JsonObj
function getTable(tableData) {

  var userProperties = PropertiesService.getUserProperties();
  var rangeString = userProperties.getProperty('rangeString');
  var headerRow = Number(userProperties.getProperty('headerRow'));
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var objRowRange = {
      'header' : 1,
      'rowStart': 2,
      'rowEnd': 2
  }
  
  var range = sheet.getRange(rangeString);
  objRowRange.header = headerRow;
  objRowRange.rowEnd = range.getLastRow();
  objRowRange.rowStart = range.getRow();

  if(objRowRange.rowStart === objRowRange.header)
    objRowRange.rowStart = objRowRange.rowStart+1;

  //todo - check there is atleast one header and 1 data row
  
  /*
   * set rowRange
   * JsonObj.rowRange is an object with keys header, rowStart and rowEnd
   * header, rowStart and rowEnd are integers
   */
  JsonObj.rowRange = objRowRange;

  //sending entire sheet data 
  var rangeAll = sheet.getDataRange();
  return rangeAll.getValues();

}

// function to call gcp function using json input for query
function callGcpUsingJson(jsonInput){

  var outputQuery = callGcpFunc(jsonInput);
  var outputTable = outputQuery["outputTable"];
  var suggestions = outputQuery["suggestions"];
  
  //converting date from json into javascript date object
  outputTable = formatDate(outputTable);
  var query = [jsonInput,outputQuery];
  return query;
}

//function to call gcp function to obtain result from the received data
function callGcpFunc(inputJson) {

  var options = {
  'method' : 'post',
  'contentType': 'application/json',
  // Convert the JavaScript object to a JSON string.
  'payload' : inputJson
  };
    
  var response= UrlFetchApp.fetch(
                  "https://us-central1-mocha-interns.cloudfunctions.net/testfunction",
                  options);

  var outputQuery = JSON.parse(response.getContentText());

  //printing output received from gcp python function
  Logger.log("output of query",outputQuery);
  return outputQuery;
}

//function to convert date from json format to javascript date object
function formatDate(outputTable) {

  var index = -1;    // default index value = -1

  //printing date column name
  Logger.log("date column");
  Logger.log(JsonObj['dateRange']['dateCol']);

  //checking output table header row to find the index of date column
  for(var i = 0; i < outputTable[0].length; i++) {
    if(outputTable[0][i] === JsonObj['dateRange']['dateCol']){
      index = i;
      break; 
    }
  }

  //when index is not equal to -1 date column exists in output 
  //we need to convert the date column from json date format to sheets date format
  if(index !== -1) {
    for(var i = 1; i < outputTable.length; i++) {
      outputTable[i][index] = new Date(outputTable[i][index]);    
    }
  }

  //outputTable is updated with correct date format
  return outputTable;
}

//function to add output in sheet at provided location
function addingInSheet(sheetName,sheetRow,sheetColumn,outputTable){
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet=ss.getSheetByName(sheetName);
  
  //if sheet with the name user specified exists we use it 
  //else we create a new sheet with the provided name
  if(sheet) {
    ss.setActiveSheet(sheet);
  }
  else {
    ss.insertSheet(sheetName);
    sheet = SpreadsheetApp.getActiveSheet();
  }
  
  //setting cells values =  outputTable 
  var dataRange = sheet.getRange(sheetRow,sheetColumn,outputTable.length,outputTable[0].length);
  dataRange.clear();
  dataRange.setValues(outputTable);
  
  dataRange
    .setFontFamily('Georgia')
    .setFontSize('12')
    .setBorder(true, true, true, true,true,null,null,SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
 
 //formatting output sheet's header
  var headerRange = sheet.getRange(sheetRow, sheetColumn, 1, outputTable[0].length);
  headerRange
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackgroundColor('#073763')
    .setHorizontalAlignment('center');
  
}
