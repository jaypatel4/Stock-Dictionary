/*
Instantiate the hashmap that holds both the display name and the respective JSON attribute names being accessed from the returned file
*/
var attributeNames = { 
  "Exchange" : "exchangeName",
  "Symbol": "symbol",
  "Current": "regularMarketPrice",
  "Open": "regularMarketOpen",
  "High": "regularMarketDayHigh",
  "Low": "regularMarketDayLow",
  "Market Cap": "marketCap",
  "Prev Close":"regularMarketPreviousClose",
  "Volume": "regularMarketVolume",
}

/* 
Contains what attributes you want to appear on the left side of the tooltip, attributes are the keys in the attributeNames map (i.e Exchange)
*/
var leftAttributeList =  [
  "Symbol",
  "Exchange",
  "Current",
  "Open",
  "High",
  "Low"
]

/*
Contains what attributes you want to appear on the right side of the tooltip, attributes are the keys in the attributeNames map (i.e Exchange)
*/
var rightAttributeList = [
  "Market Cap",
  "Prev Close",
  "Volume"
]

function sendMessage(message, callback) {
  chrome.runtime.sendMessage({
    text: message
  }, function(response) {
    if(response) {
      console.log(response);
      callback(response);
    }
    else {
      console.log("no response");
      callback("none");
    }
  });
}


/* 
Converts large numbers to the format: xK, xM, xB, or xT where x is a number, K = Thousand M = Million B = Billion T = Trillion
*/
function convertValue(value) {
  // Finds the value x, rounds the number to the nth digit (toFixed(n)), converts to a string and adds the character representing the respective value
  if(value > 10000000000000) {
    return ((value/1000000000000)
    .toFixed(2)
    .toString()
    .concat("T"));
  }
  else if(value > 1000000000) {
    return ((value/1000000000)
    .toFixed(1)
    .toString()
    .concat("B"));
  }
  else if(value > 1000000) {
    return ((value/1000000)
    .toFixed(0)
    .toString()
    .concat("M"));
  }
  else {
    // The value is small enough that it does not need to be shortened to fit within the tooltip
    return value.toFixed(2);
  }
}

// Retrieves the value of a specified element in the data returned from the API call
function getValue(data, element) {
  var dataAttribute = attributeNames[element];
  return data.price[dataAttribute];
}


/*
Creates the tooltip container on the wrapper containing the text highlighted
*/
function createTooltip(tooltipContainer) {
  tippy('#tooltip', {
    content: tooltipContainer,
    theme: 'blueGradient',
    showOnCreate: true,
    placement: 'bottom',
  });
}

/*
This function creates each item as they are added
To customize to your liking you can edit the size of the elements in the tooltip by changing width below
*/
function createListItem(side, value, attribute) {
  var listItem = document.createElement('li');
  listItem.textContent = attribute;
  // Change the below widths for list element widths
  if(side) {
    listItem.style.width = "150px";
  }
  else {
    listItem.style.width = "140px";
  }

  // Creates the proper identifier in the list, particularly the exchange has to be shortened to fit inside the tooltip
  var valueHolder = document.createElement('span');
  valueHolder.style.float = "right";
  if(typeof value == 'number') {
    value = convertValue(value);
  }
  else if(attribute == "Exchange") {
    value = value.toString();
    if(value.includes("Nasdaq")) {
      value = "NASDAQ";
    }
    console.log(value);
  } 
  
  // Place the text content into the list which will be added to the tooltip on return
  valueHolder.textContent = value;
  listItem.appendChild(valueHolder);
  return listItem;
}

/*
This function takes the first sentence in the business summary in their filings to create a general description of the company
The summary is seen as the bottom third of the tooltip
*/
function createSummary(summary) {
  summary.toString()
  if(summary != "") {
    var first = true;
    var endIndex = 0;
    for(let i = 0; i < summary.length; i++) {
      
      // Find the first sentence and stop
      if(summary.charAt(i) == ".") {
        
        // All corporations will have an initial . in their corporation name hence we can skip it to get to the first sentence
        if(first != true) {
          endIndex = i;
          break;
        }
        
        // Replacing the , will remove the commas used in the listed corporation name
        summary = summary.substr(0,i).replace(",","").concat(summary.substr(i));
        first = false;
      }
    }
    summary = summary.substr(0,endIndex).concat(".");
  }
  return summary;
}

/* 
Listens for text being highlighted, when this occurs the tooltip is created
*/
$(document.body).on('mouseup', function(e) {
  
    // Getting the text selected from the body of the document
    var selection = window.getSelection ? window.getSelection() : document.selection.createRange();

    // Providing an id for the selected object so we can remove the previous tool tip
    var selectedObject = $('#tooltip');
    selectedObject.contents().unwrap();
    
    // Extracting the raw text from the selection object taken from the window.getSelection or document.selection
    var text = "";
    if (window.getSelection) {
        text = window.getSelection().toString();
    } 
    else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }

    if (text !== "") {
      
      //Wrapping the selected text in a span so we can refer to it with the id = tool tip
      var range = selection.getRangeAt(0);
      var newNode = document.createElement("span");
      newNode.setAttribute('id', 'tooltip');
      range.surroundContents(newNode);

      // Request the data from the background script, which will make the call to the yahoo finance API
      sendMessage(text, function(data) {

        // Create the div that will contain all the elements in the tooltip
        let tooltipContainer = document.createElement('div');
        tooltipContainer.classList.add('tooltipContainer');

        // Create a div that will hold the title and set its class id
        let titleContainer = document.createElement('div');
        titleContainer.classList.add('titleContainer')        

        // Create the title and set its class id
        let title = document.createElement('div');
        title.classList.add('title');

        // Set the text as the name of the company, company names in the data have a , before the corporation type which can be removed
        title.textContent = data.price["shortName"].replace(",","");

        // Add the title to the titleContainer div
        titleContainer.appendChild(title);

        // Add the titleContainer div to the tooltipContainer div so it is positioned at the very top
        tooltipContainer.appendChild(titleContainer);

        // Create a div which will contain the list of attributes displayed on the left side
        let leftListContainer = document.createElement('div');
        leftListContainer.classList.add('left');

        // Create a div which will contain the list of attributes displayed on the right side
        let rightListContainer = document.createElement('div');
        rightListContainer.classList.add('right');

        // leftList is a list containing all the attributes described in leftAttributeList
        let leftList = document.createElement('ul');
        leftList.classList.add('list');

        // rightList is a list containing all the attributes described in rightAttributeList
        let rightList = document.createElement('ul');
        rightList.classList.add('list');
        
        // Iterate through the list of specified attributes that should be included in the left list and set their respective values
        for(let i = 0; i < leftAttributeList.length; i++) {
          var value = getValue(data, leftAttributeList[i]);
          var listItem = createListItem(false, value, leftAttributeList[i]);
          leftList.appendChild(listItem);
        }

        // Iterate through the list of specified attributes that should be included in the right list and set their respective values
        for(let i = 0; i < rightAttributeList.length; i++) {
          var value = getValue(data, rightAttributeList[i]);
          var listItem = createListItem(true, value, rightAttributeList[i]);
          rightList.appendChild(listItem);
        }

        // Create both sides of the left and right list as a singular container
        leftListContainer.appendChild(leftList);
        rightListContainer.appendChild(rightList);
        tooltipContainer.appendChild(leftListContainer);
        tooltipContainer.appendChild(rightListContainer);


        // Create a placeholder to allow space for the summary below
        var empty = document.createElement('div');
        tooltipContainer.appendChild(empty);

        // Create a summary container and add all text content using the first sentence returned from createSummary
        var summaryContainer = document.createElement('div');
        summaryContainer.classList.add('summaryContainer');
        var summary = document.createElement('div');
        summary.classList.add('summary');
        summary.textContent = createSummary(data.summaryProfile.longBusinessSummary);
        summaryContainer.appendChild(summary);

        // Add the summary container to the final tooltip
        tooltipContainer.appendChild(summaryContainer);
        
        // Return the tooltip container so it can be created by tippy
        createTooltip(tooltipContainer);
      })
    }
  }); 