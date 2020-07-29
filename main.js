// Logout function
function logout() {
  firebase.auth().signOut();
}

// Initialization of firebase app, and called whenever auth state is changed
function initApp() {
  // Listening for auth state changes.
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      var displayName = user.displayName;
      var email = user.email;
      var emailVerified = user.emailVerified;
      var photoURL = user.photoURL;
      var isAnonymous = user.isAnonymous;
      var uid = user.uid;
      var providerData = user.providerData;
    }
  });
}

var modal = document.getElementById("calendarModal");
var submitDate = document.getElementById("submit_date");
var randomDate = document.getElementById("random_date");
var body = document.getElementsByTagName("body")[0];

// Initialize app when window loaded, and display date selector modal
window.onload = function() {
  initApp();
  modal.style.display = "block";
  body.style.overflow = "hidden";
  date = new Date();
  date.setDate(date.getDate() - 370);
  document.getElementById("pick_date").setAttribute("max", date.toISOString().substring(0,10));
}

// Date submit click handler
submitDate.onclick = function() {
  userDate = document.getElementById("pick_date").value;
  parsedDate = new Date(userDate);
  maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 370);
  minDate = new Date("1999-11-01");
  if (userDate == "") {
    notify("Please enter a date");
  }
  else if (parsedDate < minDate || parsedDate > maxDate) {
    notify("Please enter a date between 11/01/1999 and " + maxDate.toLocaleDateString('en-US', {timeZone: 'UTC'})); 
  }
  else {
    body.style.overflow = "auto";
    modal.style.display = "none";
    start(parsedDate);
  }
}

// Random date click handler
randomDate.onclick = function() {
  maxDate = new Date();
  maxDate.setDate(maxDate.getDate() - 370);
  minDate = new Date("1999-11-01");
  from = minDate.getTime();
  to = maxDate.getTime();
  generatedDate = new Date(from + Math.random() * (to - from));
  body.style.overflow = "auto";
  modal.style.display = "none";
  start(generatedDate);
}

var notificationBar = document.getElementById('notification_bar');
var animate;

// Handles notification bar at bottom of screen; type is either "log" or "error",
// and the bar will be green or red, respectively
async function notify(text, type) {
  clearTimeout(animate);
  if (type == "log") {
    notificationBar.classList.remove("error");
    notificationBar.classList.add("log");
  }
  else {
    notificationBar.classList.remove("log");
    notificationBar.classList.add("error");
  }
  document.getElementById("notification_text").innerHTML = text;
  notificationBar.classList.add('fade');
  animate = await setTimeout(function(){notificationBar.classList.remove('fade')}, 4000);
}

// definitions of variables
const apiKey = "SK92GYM09TPNS82E";
var daysRemaining = 365;
var cashAvailable = 5000;
var portfolioValue = 0;
var currentTicker = "AAPL";
var validDates;
var userStocks = {};
var date;

// initialize site with data for Apple stock
async function start(initialDate) {
  await getValidDates();
  while (!(initialDate.toISOString().substring(0,10) in validDates)) {
    initialDate.setDate(initialDate.getDate() + 1);
  }
  date = initialDate;
  if (await updateTicker("AAPL")) {
    updateGraph("AAPL");
  }
  document.getElementById("current_date").innerHTML = date.toLocaleDateString('en-US', {timeZone: 'UTC'});
  document.getElementById("days_remaining").innerHTML = daysRemaining;
  document.getElementById("cash_available").innerHTML = cashAvailable.toFixed(2);
  document.getElementById("portfolio_value").innerHTML = portfolioValue.toFixed(2);
  document.getElementById("total_assets").innerHTML = (cashAvailable + portfolioValue).toFixed(2);
}

// get all valid trading days in AlphaVantage history, by getting time series for Apple and grabbing date strings
async function getValidDates() {
  const url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=AAPL&outputsize=full&apikey=" + apiKey;
  const dates = await fetch(url)
    .then(response => response.json())
    .then(data => data["Time Series (Daily)"]);
  validDates = dates;
  return;
}

// move current date forward by one and update statistics/graph; stop if user has reached current date
function advanceDate() {
  maxDate = new Date();
  if (date < maxDate && daysRemaining > 0) {
    date.setDate(date.getDate() + 1);
    daysRemaining--;
    while (!(date.toISOString().substring(0,10) in validDates) && date < maxDate) {
      date.setDate(date.getDate() + 1);
      daysRemaining--;
    }
    if (daysRemaining < 0) {
      daysRemaining = 0;
    }
    updateGraph(currentTicker);
    prevDayAssets = cashAvailable + portfolioValue;
    updatePortfolioValue();
    document.getElementById("current_date").innerHTML = date.toLocaleDateString('en-US', {timeZone: 'UTC'});
    document.getElementById("days_remaining").innerHTML = daysRemaining;
    document.getElementById("cash_available").innerHTML = cashAvailable.toFixed(2);
    document.getElementById("portfolio_value").innerHTML = portfolioValue.toFixed(2);
    document.getElementById("total_assets").innerHTML = (cashAvailable + portfolioValue).toFixed(2);
    var oneDayChange = cashAvailable + portfolioValue - prevDayAssets;
    var totalChange = cashAvailable + portfolioValue - 5000;
    document.getElementById("24hr_change_dollars").innerHTML = oneDayChange.toFixed(2);
    document.getElementById("24hr_change_percent").innerHTML = (100 * oneDayChange / prevDayAssets).toFixed(2);
    document.getElementById("total_change_dollars").innerHTML = totalChange.toFixed(2);
    document.getElementById("total_change_percent").innerHTML = (100 * totalChange / 5000).toFixed(2);
    document.getElementById("shares_dollars").innerHTML = (userStocks[currentTicker].shares * getCurrentPrice(currentTicker)).toFixed(2);
    if (daysRemaining == 0) {
      alert("Time's up!");
    }
  }
}

// get current price of stock
function getCurrentPrice(ticker) {
  return Number(userStocks[ticker].timeSeries[date.toISOString().substring(0,10)]['5. adjusted close']);
}

// buy a number of shares of current stock
function buy() {
  numShares = Number(document.getElementById("buy_sell_shares").value);
  document.getElementById("buy_sell_shares").value = "";
  if (!Number.isInteger(numShares) || numShares < 1) {
    notify("Invalid number of shares specified", "error");
    return;
  }
  if (getCurrentPrice(currentTicker) * numShares <= cashAvailable) {
    cashAvailable -= getCurrentPrice(currentTicker) * numShares;
    userStocks[currentTicker].shares += numShares;
    notify("Purchased " + numShares + " shares of $" + currentTicker + " at $" + getCurrentPrice(currentTicker).toFixed(2), "log");
  }
  else {
    notify("Insufficient funds", "error");
  }
  updateStats();
}

// buy max number of shares of current stock
function buyMax() {
  numShares = Math.floor(cashAvailable / getCurrentPrice(currentTicker));
  if (numShares != 0) {
    cashAvailable -= getCurrentPrice(currentTicker) * numShares;
    userStocks[currentTicker].shares = numShares;
    notify("Purchased " + numShares + " shares of $" + currentTicker + " at $" + getCurrentPrice(currentTicker).toFixed(2), "log");
    updateStats();
  }
}

// sell a number of shares of current stock
function sell() {
  numShares = Number(document.getElementById("buy_sell_shares").value);
  document.getElementById("buy_sell_shares").value = "";
  if (!Number.isInteger(numShares) || numShares < 1) {
    notify("Invalid number of shares specified", "error");
    return;
  }
  if (numShares <= userStocks[currentTicker].shares) {
    cashAvailable += getCurrentPrice(currentTicker) * numShares;
    userStocks[currentTicker].shares -= numShares;
    notify("Sold " + numShares + " shares of $" + currentTicker + " at $" + getCurrentPrice(currentTicker).toFixed(2), "log");
  }
  else {
    notify("Insufficient shares", "error");
  }
  updateStats();
}

// sell max number of shares of current stock
function sellAll() {
  numShares = userStocks[currentTicker].shares;
  if (numShares != 0) {
    cashAvailable += getCurrentPrice(currentTicker) * numShares;
    userStocks[currentTicker].shares = 0;
    notify("Sold " + numShares + " shares of $" + currentTicker + " at $" + getCurrentPrice(currentTicker).toFixed(2), "log");
    updateStats();
  }
}

// update statistics at bottom of screen
function updateStats() {
  updatePortfolioValue();
  document.getElementById("num_shares").innerHTML = userStocks[currentTicker].shares;
  document.getElementById("shares_dollars").innerHTML = (userStocks[currentTicker].shares * getCurrentPrice(currentTicker)).toFixed(2);
  document.getElementById("cash_available").innerHTML = cashAvailable.toFixed(2);
  document.getElementById("portfolio_value").innerHTML = portfolioValue.toFixed(2);
  document.getElementById("total_assets").innerHTML = (cashAvailable + portfolioValue).toFixed(2);
  if (document.getElementById(currentTicker) == null && userStocks[currentTicker].shares != 0) {
    var table = document.getElementById("holdings_table");
    var row = table.insertRow(1);
    row.setAttribute("id", currentTicker);
    var cell1 = row.insertCell(0);
    cell1.innerHTML = currentTicker;
    var cell2 = row.insertCell(1);
    cell2.innerHTML = userStocks[currentTicker].shares;
  }
  else {
    if (userStocks[currentTicker].shares == 0) {
      var row = document.getElementById(currentTicker);
      row.parentNode.removeChild(row);
    }
    var cell = document.getElementById(currentTicker).getElementsByTagName("td")[1];
    cell.innerHTML = userStocks[currentTicker].shares;
  }
}

// update value of all assets
function updatePortfolioValue() {
  val = 0;
  for (var key in userStocks) {
    if (typeof userStocks[key].timeSeries[date.toISOString().substring(0,10)] !== 'undefined') {
      numShares = userStocks[key].shares;
      sharePrice = getCurrentPrice(key);
      val += numShares * sharePrice
    }
  }
  portfolioValue = val;
}

// update current stock and graph
async function updateAll() {
  var ticker = document.getElementById("new_ticker").value.toUpperCase();
  document.getElementById("new_ticker").value = "";

  // TODO replace with better validation/trimming
  if (ticker.length == 0) {
    return;
  }
  if (ticker.charAt(0) == '$') {
    ticker = ticker.substring(1, ticker.length);
  }
  if (ticker.length == 0) {
    return;
  }

  // TODO handle reaching API call limit from AV
  if (await updateTicker(ticker)) {
    updateGraph(ticker);
  }
}

// update current selected stock
async function updateTicker(ticker) {

  // if ticker absent in local storage

  // TODO: abstract into another method
  if (!(ticker in userStocks)) {
    url = "https://www.alphavantage.co/query?function=OVERVIEW&symbol=" + ticker + "&apikey=" + apiKey;
    let name = await fetch(url)
      .then(response => response.json())
      .then(data => data.Name);

    if (typeof name !== 'undefined') {
      console.log("ticker " + ticker + " found, saving data from alphavantage");
      url = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=" + ticker + "&outputsize=full&apikey=" + apiKey;
      let timeSeries = await fetch(url)
        .then(response => response.json())
        .then(data => data["Time Series (Daily)"]);
      userStocks[ticker] = {
        shares: 0,
        name: name,
        timeSeries: timeSeries
      }
      currentTicker = ticker;
      document.getElementById("current_ticker").innerHTML = "$" + ticker;
      document.getElementById("current_stock").innerHTML = name;
      document.getElementById("num_shares").innerHTML = 0;
      document.getElementById("shares_dollars").innerHTML = "0.00";
      return true;
    }
    else {
      notify("Unable to get data for $" + ticker, "error");
      return false;
    }
  }

  // if ticker present in local storage
  if (typeof userStocks[ticker].name !== 'undefined') {
    currentTicker = ticker;
    document.getElementById("current_ticker").innerHTML = "$" + ticker;
    document.getElementById("current_stock").innerHTML = userStocks[ticker].name;
    document.getElementById("num_shares").innerHTML = userStocks[ticker].shares;
    document.getElementById("shares_dollars").innerHTML = (userStocks[ticker].shares * getCurrentPrice(ticker)).toFixed(2);
    return true;
  }
  else {
    return false;
  }
}

// update graph for current stock
async function updateGraph(ticker) {
  if (!(ticker in userStocks)) {
    console.error("ticker not found in storage");
  }
  jsonData = userStocks[ticker].timeSeries;

  var trace = {
    type: "scatter",
    mode: "lines",
    x: [],
    y: [],
    line: {color: 'lime'}
  }

  var data = [trace];

  for (var key in jsonData) {
    if (jsonData.hasOwnProperty(key)) {
      if (Date.parse(key) <= date) {
        trace.x.push(key);
        trace.y.push(jsonData[key]['5. adjusted close']);
      }
    }
  }

  // a week ago
  var date1 = new Date(date);
  date1.setDate(date1.getDate() - 30);

  min = 0;
  max = 0;
  first = 0;
  last = 0;

  for (var i = new Date(date1); i <= date; i.setDate(i.getDate() + 1)) {
    dateString = i.toISOString().substring(0,10);
    if (dateString in jsonData) {
      closePrice = Number(jsonData[dateString]['5. adjusted close']);
      if (first == 0) {
        min = closePrice;
        max = closePrice;
        first = closePrice;
      }
      if (closePrice < min) {
        min = closePrice;
      }
      if (closePrice > max) {
        max = closePrice;
      }
      last = closePrice;
    }
  }

  if (first > last) {
    trace.line.color = 'red';
  }

  var layout = {
    title: '$' + ticker + ' Stock Price',
    paper_bgcolor: '#003',
    plot_bgcolor: '#003',
    font: {
      family: 'Roboto Mono, monospace',
      color: '#fff'
    },
    coloraxis: {
      colorbar: {
        tickcolor: '#fff',
        showticklabels: false
      }
    },
    titlefont: {
      size: 30
    },
    xaxis: {
      range: [date1, date],
      gridcolor: '#335'
    },
    yaxis: {
      range: [min, max],
      gridcolor: '#335'
    }
  };

  var config = {
    responsive: true
  }

  Plotly.newPlot('graphic', data, layout, config);
}