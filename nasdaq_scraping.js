var axios = require('axios');
var readline = require('readline');
var httpProxy=require('http-proxy');
var express=require('express');
var cheerio = require('cheerio');

//create interface for command line with input and output
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});


function menu(){
  var func_arr = [
    nasdaq_get,
  ];

  var command_Stuff = new Object();

  console.log(Object.values(func_arr));
  //prompt user to enter command
  rl.question("Enter the command: ", function(command){
    command_Stuff.command=command;
    command=command.toLowerCase().split(' ')[0];
    for(var i=0; i<func_arr.length; i++){
      if(command === func_arr[i].name.toLowerCase()){
        return func_arr[i](command_Stuff);
      }
    }
    console.log("Invalid command!!!");
    menu();
  });
}

//this function is used to prompt the user to return to the menu or not
function return_menu(){
  var valid_choices = ["y", "n"];
  rl.question("\n\nDo you wish to return to the menu(y/n): ", function(arg){
    arg = arg.toLowerCase();
    if(valid_choices.includes(arg)){
      if(arg === valid_choices[0]){
        menu();
      }
      else{
        console.log("Done...");
        rl.close();
      }
    }
    else{
      console.log("Invalid input!!!");
      return_menu();
    }
  });
}

async function serverSetUp(){
  //set up a proxy server to pass requests through to avoid forbidden 403 error
  const proxyServer = httpProxy.createProxyServer({});
  const app = express();
  //app.get is used to handle GET requests, app.post is used to handle POST requests

  app.get('*', function(req, res) {
    console.log(`protocol=${req.protocol}, hostname=${req.hostname}`);
    console.log(`${req.protocol}://${req.hostname}`);
    proxyServer.web(req, res, { target: `${req.protocol}://${req.hostname}` });
  });
  //use port 3200
  const server = await app.listen(3200);
}

function line_generator(line_char, line_length){ //generate a line using a character and set the length
  var line=line_char;
  for(var i=0; i<line_length; i++) {
    line = line + line_char;
  }
  return line; //return the generated line
}

function tag_remover(str){
  if(str.search(/\</i) !== -1){
    while(str.search(/\</i) !== -1){
      var bracket_pos_1 = str.search(/\</i);
        var bracket_pos_2 = str.search(/\>/i);
        var str_remove = str.slice(bracket_pos_1, bracket_pos_2+1);
        str = str.replace(str_remove, '');
    }
  }
  return str;
}

function wikiSearch(indice_str, ticker, obj){
  var table_link="";
  var ticker_pos="";
  var link_pos="";

  if(indice_str === "nasdaq-100"){
    table_link="https://en.wikipedia.org/wiki/NASDAQ-100";
    ticker_pos=1;
    link_pos=0;
  }
  else if(indice_str === "sp-500"){
    table_link="https://en.wikipedia.org/wiki/List_of_S%26P_500_companies";
    ticker_pos=0;
    link_pos=1;
  }
  else if(indice_str === "ftse-100"){
    table_link="https://en.wikipedia.org/wiki/FTSE_100_Index";
    ticker_pos=1;
    link_pos=0;
  }

  const base_Url="https://en.wikipedia.org/wiki/";

  axios(table_link).then(function(response){
    var body=response.data;
    let constituents=cheerio.load(body);
    constituents('table#constituents tbody tr').each(function(i, el){
      let table_entry=constituents(el);
      var ticker_entry=table_entry.children('td').eq(ticker_pos).text().trim();
      console.log(ticker_entry);
      if(ticker == ticker_entry){
        var comp_wiki="https://en.wikipedia.org" + table_entry.children('td').eq(link_pos).children('a').attr('href');
        console.log(`comp_wiki=${comp_wiki}`);
        companyDataRetr(comp_wiki, obj);
        return false;
      }
    });

  });

}

function line_generator(line_char, line_length){
  var line=line_char;
  for(var i=0; i<line_length; i++) {
    line = line + line_char;
  }
  return line;
}

function bracket_remover(str){
  if(str.search(/\]/i) !== -1){
    while(str.search(/\]/i) !== -1){
      var bracket_pos_1 = str.search(/\[/i);
        var bracket_pos_2 = str.search(/\]/i);
        var str_remove = str.slice(bracket_pos_1, bracket_pos_2+1);
        str = str.replace(str_remove, '');
    }
  }
  return str;
}

function companyDataRetr(url, obj){
  console.log(url);
  axios(url).then(function(response){
    var body=response.data;
    let comp_txt=cheerio.load(body);
    comp_txt('div.mw-parser-output p b').each(function(i, el){
      let indice_txt=comp_txt(el);
      if(i === 0){
        var descr=bracket_remover(indice_txt.parents('p').text());
        console.log(descr);
        var logo="";
        var hq="";
        var industry="";
        comp_txt('table.infobox.vcard tbody tr th').each(function(i, el){
          var box=comp_txt(el);
          if(box.text() === "Headquarters"){
            hq = box.parent('tr').children('td').text();
          }
          else if(box.text() === "Industry"){
            industry = box.parent('tr').children('td').text();
          }
        });
        descr = `<p>Source: ${url}\n**Industry:** ${industry}\n**Headquarters:** ${hq}\n**Company Overview:** ${descr}>/p>`;
        console.log(descr);
        return false;
      }
    });
  });
}

function nasdaq_get(command_stuff){

  var keyWord=command_stuff.command;
  console.log(keyWord);
  if((keyWord !== "l") && (keyWord.search("--kw") !== -1)){
    keyWord=command_stuff.command.split('--kw')[1].trim();
    console.log(keyWord);
  }

  var msg_str="";
  const url = 'https://api.nasdaq.com/api/quote/list-type/nasdaq100';


  var options={
    url: url,
    proxy: {
      host: 'localhost',
      port: 3200
    },
  }
  //A custom user agent is used so that requests made to the nasdaq API are not rejected
  //the data to be retrieved is in JSON format

  var signal_Dict = {
    "+": 1,
    "-": 0
  };

  var title_Str="Command guide for accessing NASDAQ100 data";
  var help_Str = `${title_Str}\n${line_generator('-', title_Str.length-1)}\n\n
  1. To display the components of NASDAQ100: "nasdaq_get --l"\n
  2. To display data associated with a specific company: "nasdaq_get --kw(TICKER OR COMPANY Name)"\n
  3. To display market info: "nasdaq_get --market-info\n"`;

  if(keyWord.search('--l') !== -1){
    console.log("listing!!!");
    axios(options).then(function(response){
      var body=response.data;
      console.log(body);
      var date_str=`Time Stamp: ${body.data['date']}`;
      var stock_recs=body.data.data.rows;
      console.log(stock_recs);
      msg_str = msg_str + `Components of NASDAQ100\n${date_str}\n${line_generator('-', date_str.length-1)}\n\n`;
      Object.keys(stock_recs).forEach(function(key) {
        console.log(key);
        var companyName = stock_recs[key].companyName.toString();
        var symbol = stock_recs[key].symbol.toUpperCase();
        msg_str = msg_str + `Symbol: ${symbol}, Name: ${companyName}\n\n`;
      });
      console.log(msg_str);
    }).catch(function(err){
      console.log(err);
    });
  }
  else if(keyWord.toLowerCase() === 'help'){
    console.log(help_Str);
  }
  else if(keyWord.toLowerCase().search("market-info") !== -1){
    options.url="https://api.nasdaq.com/api/market-info";
    axios(options).then(function(response){
      var body=response.data;
      console.log(body.data);

      Object.keys(body.data).forEach(function(el, idx){
          console.log(`${el}: ${body.data[el]}`);
      })

    })
  }
  else{
    axios(options).then(function(response){
      var body=response.data;
      var date=body.data['date'];
      var stock_recs=body.data.data.rows;
      msg_str = msg_str + `Time Stamp: ${date}\n`;
      Object.keys(stock_recs).forEach(function(key) {
        var companyName = stock_recs[key].companyName.toString();
        var symbol = stock_recs[key].symbol.toUpperCase();
        if(((companyName.toLowerCase().search(keyWord.toLowerCase()) !== -1) || (symbol.toLowerCase().search(keyWord.toLowerCase()) !== -1)) && (typeof keyWord !== 'undefined')){

          var marketCap = stock_recs[key].marketCap;
          var last = stock_recs[key].lastSalePrice;
          var netChange = stock_recs[key].netChange;
          var percenChange = stock_recs[key].percentageChange;
          msg_str=`Source: ${url}\nSymbol: ${symbol}\nName: ${companyName}\nMarket Cap: ${marketCap}\nLast sale price: ${last}\nNet change: ${netChange}\nPercentage change: ${percenChange}`;
          console.log(msg_str);
          var textObj={
            text: msg_str
          };
          wikiSearch("nasdaq-100", symbol, textObj);
          console.log(msg_str);
          return false;
        }
      });
    });
  }
}

serverSetUp();
menu();
