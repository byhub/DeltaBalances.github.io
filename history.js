{

	// shorthands
	var _delta = bundle.EtherDelta;
	var	_util = bundle.utility;
	
	// initiation
	var initiated = false;
	var autoStart = false;
	
	var requestID = 0;
	
	// loading states
    var tableLoaded = false;
	var loadedLogs = 0;
	var displayedLogs = false;
	
	var trigger1 = false;
	var running = false;
	
	
	// settings
    var decimals = false;
	var fixedDecimals = 3; 
	
	var showTransactions = true;
    var showBalances = true;	
	var showCustomTokens = true;
	

    // user input & data
	var publicAddr = '';
    var lastResult = undefined;
	
	var blockReqs = 0;
	var blockLoaded = 0;
	
	// config
	var blocktime = 14;
	var blocknum = -1;
	var startblock = 0;
	var endblock = 0;	
	var transactionDays = 1;
	var useDaySelector = true;
	const minBlock = 3154197; //https://etherscan.io/block/3154196  etherdelta_2 creation
	
	
	var uniqueTokens = {};
	var uniqueBlocks = {}; //date for each block
	var blockDates = {};
	
	// placeholder
	var transactionsPlaceholder = [
		{
			Type: 'Taker',
			Trade: 'Sell',
			Token:  { "name": "Token", "addr":"0x00"},
			Amount: 0,
			Price: 0,
			ETH: 0,
			Hash: '0xH4SH',
			Block: '',
			Date: toDateTimeNow(),
			Buyer: '',
			Seller: '',
			Fee: 0,
			FeeToken: { "name": "Token", "addr":"0x00"},
			Details: window.location.origin + window.location.pathname + '/../tx.html',
			Unlisted: true,
		}
	];
		
	
	init();
	
	$(document).ready(function() 
	{
		readyInit();  
    });
	
	function init()
	{	
		// borrow some ED code for compatibility
        _delta.startEtherDelta(() => 
		{	
			//if(!autoStart)
			{
				if(blocknum > -1)
				{
					startblock = getStartBlock();
				}
				else {
					_util.blockNumber(_delta.web3, (err, num) => 
					{
						if(!err && num)
						{
							blocknum = num;
							startblock = getStartBlock();
						}
					});
				}
			}
			//import of etherdelta config
			if(etherDeltaConfig && etherDeltaConfig.tokens)
			{
				_delta.config.tokens = etherDeltaConfig.tokens;
			}
			else 
			{
				showError('failed to load token data');
				return;
			}
			
			tokenBlacklist = []; //blacklist only for balances
			
			// note all listed tokens
			for(var i = 0; i < _delta.config.tokens.length; i++)
			{
				var token = _delta.config.tokens[i];
				if(token)
				{
					token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
					token.addr = token.addr.toLowerCase();
					token.unlisted = false;
					_delta.config.tokens[i] = token;
					if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
					{	
						uniqueTokens[token.addr] = token;
					}
				}
			}
			
			//format MEW tokens like ED tokens
			offlineCustomTokens = offlineCustomTokens.map((x) => { return {"name": escapeHtml(x.symbol),
																		   "addr": x.address.toLowerCase(),
																		   "unlisted": true,
																		   "decimals":x.decimal,
																		  };
																 });
			//filter out custom tokens that have been listed by now
			_delta.config.customTokens = offlineCustomTokens.filter((x) => {return !(uniqueTokens[x.addr])});
			// note custom tokens
			for(var i = 0; i < _delta.config.customTokens.length; i++)
			{
				var token = _delta.config.customTokens[i];
				if(token && !tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) {
					uniqueTokens[token.addr] = token;
				}
			}
			
			// treat tokens listed as staging as unlisted custom tokens
			if(stagingTokens && stagingTokens.tokens)
			{
				//filter tokens that we already know
				var stageTokens = stagingTokens.tokens.filter((x) => {return !(uniqueTokens[x.addr])});
				for(var i = 0; i < stageTokens.length; i++)
				{
					var token = stageTokens[i];
					if(token)
					{
						token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
						token.addr = token.addr.toLowerCase();
						token.unlisted = true;
						if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
						{	
							uniqueTokens[token.addr] = token;
							_delta.config.customTokens.push(token);
						}
					}
				}
			}
			
			if(allShitCoins)
			{
				//filter tokens that we already know
				var shitCoins = allShitCoins.filter((x) => {return !(uniqueTokens[x.addr]) && true;});
				for(var i = 0; i < shitCoins.length; i++)
				{
					var token = shitCoins[i];
					if(token)
					{
						token.name = escapeHtml(token.name); // escape nasty stuff in token symbol/name
						token.addr = token.addr.toLowerCase();
						token.unlisted = true;
						if(!tokenBlacklist[token.addr] && !uniqueTokens[token.addr]) 
						{	
							uniqueTokens[token.addr] = token;
							_delta.config.customTokens.push(token);
						}
					}
				}
			}
			
			
			initiated = true;
			//if(autoStart)
			//	myClick();
		});
	}
	
	function readyInit()
	{	
		setAddrImage('0x0000000000000000000000000000000000000000');

		// detect enter & keypresses in input
        $('#address').keypress(function(e) 
		{
            if (e.keyCode == 13) {
                $('#refreshButton').click();
                return false;
            } else {
				hideError();
				return true;
			}
        });
		
		$(window).resize(function () { 
			$("#transactionsTable").trigger("applyWidgets"); 
		});
		
		getStorage();

        placeholderTable();
		
		// url parameter ?addr=0x... /#0x..
		var addr = getParameterByName('addr');
		if(! addr)
		{
			var hash = window.location.hash;  // url parameter /#0x...
			if(hash)
				addr = hash.slice(1);
		}
		if(addr)
		{
			addr = getAddress(addr);
			if(addr)
			{
				publicAddr = addr;
				$('#loadingTransactions').show();
				//autoStart = true;
				// auto start loading
				//myClick();
			}
		} 
		else if(publicAddr) //autoload when remember is active
		{
			$('#loadingTransactions').show();
			//autoStart = true;
			// auto start loading
			//myClick();
			
		}
		else if(!addr && !publicAddr)
		{
			$('#address').focus();
		}
	}
		
	function disableInput(disable)
	{
		$('#refreshButton').prop('disabled', disable);
       // $("#address").prop("disabled", disable);
		$('#loadingTransactions').addClass('dim');
		$("#loadingTransactions").prop("disabled", disable);
	}
	
	function showLoading(trans)
	{
		if(trans)
		{
			$('#loadingTransactions').addClass('fa-spin');
			$('#loadingTransactions').addClass('dim');
			$('#loadingTransactions').prop('disabled', true);
			$('#loadingTransactions').show();
			$('#refreshButtonLoading').show();
			$('#refreshButtonSearch').hide();
		} 
	}
	
	function buttonLoading(trans)
	{
		if(!publicAddr)
		{			
			hideLoading(trans);
			return;
		}
		if(trans)
		{
			$('#loadingTransactions').removeClass('fa-spin');
			$('#loadingTransactions').removeClass('dim');
			$('#loadingTransactions').prop('disabled', false);
			$('#loadingTransactions').show();
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
	}

	function hideLoading(trans)
	{
		if(!publicAddr)
		{			
			trans = true;
		}

		if(trans) 
		{
			$('#loadingTransactions').hide();
			$('#refreshButtonLoading').hide();
			$('#refreshButtonSearch').show();
		}
	}
	
	function myClick()
	{
		if(running)
			requestID++;
		if(!initiated)
		{
			//autoStart = true;
			return;
		}
		
		hideError();
		hideHint();
		//disableInput(true);
		clearDownloads();
		
		// validate address
		if(!autoStart)
			publicAddr = getAddress();
		
		autoStart = false;
		if(publicAddr)
		{
			window.location.hash = publicAddr;
			getAll(false, requestID);
		}
		else
		{
			console.log('invalid input');
            disableInput(false);
			hideLoading(true);
		}
	}
	
	function getAll(autoload, rqid)
	{
		running = true;
		
		trigger1 = true;
		
        lastResult = undefined;
		
        if (publicAddr) 
		{	
			setStorage();
			window.location.hash = publicAddr;
			getTrans(rqid);
        } else {
			running = false;
        }
	}
	
	
	function getTrans(rqid)
	{
		if(!trigger1)
		{
			myClick(requestID);
			return;
		}
		

		
		trigger1 = false;
		loadedLogs = 0;
		displayedLogs = false;
		disableInput(true);
		blockReqs = 0;
		blockLoaded = 0;
		
		showLoading(true);
			
		$('#transactionsTable tbody').empty();
		if(blocknum > 0) // blocknum also retrieved on page load, reuse it
		{
			console.log('blocknum re-used');
			startblock = getStartBlock();
			getTransactions(rqid);
		}
		else 
		{
			console.log("try blocknum v2");
			_util.blockNumber(_delta.web3, (err, num) => 
			{
				if(num)
				{
					blocknum = num;
					startblock = getStartBlock();
				}
				getTransactions(rqid);
			});
		}
		
	}
	
	// check if input address is valid
    function getAddress(addr) 
	{
        var address = '';
        address = addr ? addr : document.getElementById('address').value;
        address = address.trim();
		
		if ( ! _delta.web3.isAddress(address))
		{
			//check if url ending in address
			if(address.indexOf('/0x') !== -1)
			{
				var parts = address.split('/');
				var lastSegment = parts.pop() || parts.pop();  // handle potential trailing slash
				if(lastSegment)
					address = lastSegment;
			}
			
			if(! _delta.web3.isAddress(address)) 
			{
				if (address.length == 66 && address.slice(0, 2) === '0x') 
				{
					// transaction hash, go to transaction details
					window.location = window.location.origin + window.location.pathname + '/../tx.html#' + address;
					return;
				} 

				// possible private key, show warning   (private key, or tx without 0x)
				if (address.length == 64 && address.slice(0, 2) !== '0x') 
				{
					if (!addr) // ignore if in url arguments
					{
						showError("You likely entered your private key, NEVER do that again");
						// be nice and try generate the address
						address = _util.generateAddress(address);
					}
				} 
				else if (address.length == 40 && address.slice(0, 2) !== '0x') 
				{
					address = `0x${addr}`;
					
				} 
				else 
				{
					if (!addr) // ignore if in url arguments
					{
					   showError("Invalid address, try again");
					}
					return undefined;
				}
				if(! _delta.web3.isAddress(address))
				{
					if (!addr) // ignore if in url arguments
					{
					   showError("Invalid address, try again");
					}
					return undefined;
				}
			}
		}
		
		document.getElementById('address').value = address;
		document.getElementById('addr').innerHTML = 'Address: <a target="_blank" href="' + _delta.addressLink(address) + '">' + address + '</a>';
		$('#overviewNav').attr("href", "index.html#" + address);
		setAddrImage(address);
		return address;
    }
	
	function setAddrImage(addr)
	{
		var icon = document.getElementById('addrIcon');
		icon.style.backgroundImage = 'url(' + blockies.create({ seed:addr.toLowerCase() ,size: 8,scale: 16}).toDataURL()+')';
	}
	
	
	function setDaySelector()
	{
		useDaySelector = true;
		validateDays();
		$('#days').prop('disabled', false);
		$('#blockSelect1').prop('disabled', true);
		$('#blockSelect2').prop('disabled', true);
	}
	
	function setBlockSelector()
	{
		useDaySelector = false;
		$('#days').prop('disabled', true);
		$('#blockSelect1').prop('disabled', false);
		$('#blockSelect2').prop('disabled', false);
		
		$(".blockInput").attr({
		   "max" : blocknum,      
		   "min" : minBlock,
		   "step" : 100,
		});
		
		if(!$('#blockSelect1').val())
			$('#blockSelect1').val(startblock);
		if(!$('#blockSelect2').val())
			$('#blockSelect2').val(blocknum);
		
		checkBlockInput();
	}
	
	function checkBlockInput()
	{
		let block1 = Math.floor($('#blockSelect1').val());
		let block2 = Math.floor($('#blockSelect2').val());
		
		if(block1 > block2) // swap if values are wrong
		{
			block1 = Math.floor($('#blockSelect2').val());
			block2 = Math.floor($('#blockSelect1').val());
		}
		
		startblock = Math.max(minBlock, block1);
		endblock = Math.min(block2, blocknum);
		
		$('#blockSelect1').val(startblock);
		$('#blockSelect2').val(endblock);
		
		if(blocknum > 0)
		{
			getStartBlock();
		}
	}
	
	function getStartBlock()
	{
		if(useDaySelector)
		{
			startblock = Math.floor(blocknum - ((transactionDays * 24 * 60 * 60) / blocktime));
			startblock = Math.max(startblock, minBlock);  
			endblock = blocknum;
			
		} 
		
		$('#selectedBlocks').html('Selected block range: <a href="https://etherscan.io/block/' + startblock + '" target="_blank">' + startblock +'</a> - <a href="https://etherscan.io/block/' + endblock + '" target="_blank">' + endblock +'</a>');
		return startblock;
	}
	
	function validateDays()
	{ 
		let input = $('#days').val();
		input = parseFloat(input);
		var days = 1;
		if(input < 0.25)
			days = 0.25;
		else if(input > 999)
			days = 999;
		else
			days = input;
		
		transactionDays = days;
		if(blocknum > 0)
		{
			getStartBlock();
		}
		 $('#days').val(days);
	}
	
	// get parameter from url
	function getParameterByName(name, url) 
	{
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	
	
	
	function getTransactions(rqid)
	{
		
		var start = startblock;
		var end = endblock;
		var max = 10000;
		
		
		loadedLogs = 0;
		
		var tradeLogResult = [];
		var contractAddr =_delta.config.contractEtherDeltaAddr.toLowerCase();

		var reqAmount = 0;
		for(var i = start; i <= end; i+= (max +1))
		{
			reqAmount++;
		}
		var rpcId = 6;
		for(var i = start; i <= end; i+= (max +1))
		{
			getLogsInRange(i, Math.min(i+max, end), rpcId);
			rpcId++;
		}
		
		function getLogsInRange(startNum, endNum, rpcID)
		{
			_util.getTradeLogs( _delta.web3, contractAddr, startNum, endNum, rpcID, receiveLogs);
		}
		
		function receiveLogs(logs)
		{
			if(rqid <= requestID)
			{
				if(logs)
				{
					loadedLogs++;
					var tradesInResult = parseOutput(logs);
					
					//get tx times
	
					var doneBlocks = {};
					for(var i = 0; i < tradesInResult.length; i++)
					{
						if(!blockDates[tradesInResult[i].Block] && !doneBlocks[tradesInResult[i].Block])
						{
							uniqueBlocks[tradesInResult[i].Block] = 1;
							doneBlocks[tradesInResult[i].Block] = true;
							var url = 'https://api.etherscan.io/api?module=block&action=getblockreward&blockno=' + tradesInResult[i].Block + '&apikey='+_delta.config.etherscanAPIKey;
							blockReqs++;
							$.getJSON( url, function( res ) {
							  if(res && res.status == "1" && res.result)
							  {
								  var unixtime = res.result.timeStamp;
								  if(unixtime)
									  blockDates[res.result.blockNumber] = toDateTime(unixtime);
							  }
							  blockLoaded++;
							  if(blockLoaded >= blockReqs)
							  {
								  if(!running)
									done();
							  }
							});
						}
					}
					tradeLogResult = tradeLogResult.concat(tradesInResult);
					done();
				} else
				{
					console.log('failed');
				}
			}
		}
		
		function done()
		{
			if(loadedLogs < reqAmount)
			{
				makeTable(tradeLogResult);
				return;
			}
			
			lastResult = tradeLogResult;
			displayedLogs = true;
			makeTable(lastResult);
		}
		
		function parseOutput(outputLogs)
		{
			var outputs = [];
			var myAddr = publicAddr.toLowerCase();
			var addrrr = myAddr.slice(2);
			
			for(i = 0; i < outputLogs.length; i++)
			{
				//quicker check, instead of decoding hex data
				if(outputLogs[i].data.indexOf(addrrr) === -1)
					continue;
				var unpacked = _util.processOutputMethod(_delta.web3, contractAddr, outputLogs[i]);
				
				if(!unpacked || unpacked.params.length < 6 || unpacked.name != 'Trade')
				{
					continue;
				}
				
				var maker = unpacked.params[4].value.toLowerCase();
				var taker = unpacked.params[5].value.toLowerCase();
				
				var transType = '';
				
				if(taker === myAddr)
					transType = 'Taker';
				else if(maker === myAddr)
					transType = 'Maker';
				
				if(transType)
				{ 
					var tradeType = '';
					var token = undefined;
					var base = undefined;
				
					if(unpacked.params[0].value === _delta.config.tokens[0].addr) // send get eth  -> buy form sell order
					{
						tradeType = 'Buy';
						token = uniqueTokens[unpacked.params[2].value];
						base = uniqueTokens[unpacked.params[0].value];
					}
					else // taker sell
					{
						tradeType = 'Sell';
						token = uniqueTokens[unpacked.params[0].value];
						base = uniqueTokens[unpacked.params[2].value];
					}
					
					if(token && base && token.addr && base.addr)
					{
						var amount = 0;
						var oppositeAmount = 0;
						var buyUser = '';
						var sellUser = '';
						

						
						if(tradeType === 'Sell')
						{
							amount = unpacked.params[1].value;
							oppositeAmount = unpacked.params[3].value;
							sellUser = unpacked.params[5].value;
							buyUser = unpacked.params[4].value;
							

						} else
						{
							oppositeAmount = unpacked.params[1].value;
							amount = unpacked.params[3].value;
							sellUser = unpacked.params[4].value;
							buyUser = unpacked.params[5].value;
							
							
						}
						
						var unlisted = token.unlisted;
						var dvsr = divisorFromDecimals(token.decimals)
						var dvsr2 = divisorFromDecimals(base.decimals)
					
						var val = _util.weiToEth(amount, dvsr);
						var val2 = _util.weiToEth(oppositeAmount, dvsr2);
						
						var price = 0;
						if(val !== 0)
						{
							price = val2 / val;
						}
						
						if(buyUser === myAddr)
							tradeType = "Buy";
						else if(sellUser === myAddr)
							tradeType = "Sell";
					
						let fee = 0;
						let feeCurrency = '';
						if(transType === 'Taker')
						{
							const fee03 = 3000000000000000; //0.3% fee in wei
							const ether1 = 1000000000000000000; // 1 ether in wei
							if(tradeType === 'Sell')
							{
								fee = _util.weiToEth(Math.round((Number(amount) * fee03) / ether1), dvsr);
								feeCurrency = token;
							}
							else if(tradeType === 'Buy')
							{
								fee = _util.weiToEth(Math.round((Number(oppositeAmount) * fee03) / ether1), dvsr2);
								feeCurrency = base;
							}
						} else {
							fee = 0;
							if(tradeType === 'Sell')
							{
								feeCurrency = token;
							}
							else if(tradeType === 'Buy')
							{
								feeCurrency = base;
							}	
						}
					
						var obj = {
							Type: transType,
							Trade: tradeType,
							Token: token,
							Amount: val,
							Price: price,
							ETH: val2,
							Hash: outputLogs[i].transactionHash,
							Date: '??', // retrieved by later etherscan call
							Block: _util.hexToDec(outputLogs[i].blockNumber),
							Buyer: buyUser,
							Seller: sellUser,
							Fee: fee,
							FeeToken: feeCurrency,
							Details: window.location.origin + window.location.pathname + '/../tx.html#' + outputLogs[i].transactionHash,
							Unlisted: unlisted,
						}
						outputs.push(obj);
					}
				}
				// if
			} // for
			return outputs;
		}

	}
	

	function showHint(text)
	{
		$('#hinttext').html(text);
		$('#hint').show();
	}
	
	function hideHint()
	{
		$('#hint').hide();
	}
	
	function showError(text)
	{
		$('#errortext').html(text);
		$('#error').show();
	}
	
	function hideError()
	{
		$('#error').hide();
	}
	

	function checkBlockDates(trades)
	{
		for(var i = 0; i < trades.length; i++)
		{
			if(blockDates[trades[i].Block])
			{
				trades[i].Date = blockDates[trades[i].Block];
			}
		}
	}

	//balances table
	function makeTable(result)
	{
		checkBlockDates(result);
		$('#transactionsTable tbody').empty();
		var filtered = result;
		var loaded = tableLoaded;
        
		buildHtmlTable('#transactionsTable', filtered, loaded, tradeHeaders);
        trigger();
	}

	// save address for next time
    function setStorage() 
	{
        if (typeof(Storage) !== "undefined")
		{
            if (remember)
			{
                localStorage.setItem("member", 'true');
                if (publicAddr)
                    localStorage.setItem("address", publicAddr);
            } else
			{
                localStorage.removeItem('member');
                localStorage.removeItem('address');
            }
        } 
    }

    function getStorage() 
	{
        if (typeof(Storage) !== "undefined") 
		{
            remember = localStorage.getItem('member') && true;
            if (remember) 
			{
                var addr = localStorage.getItem("address");
				if(addr)
				{
					addr = getAddress(addr);
					if (addr) 
					{
						publicAddr = addr;
						document.getElementById('address').value = addr;
					}
				}
				$('#remember').prop('checked', true);
            }
        } 
    }



    // final callback to sort table
    function trigger() 
	{
        if (tableLoaded) // reload existing table
        {
            $("#transactionsTable").trigger("update", [true, () => {}]);
			$("#transactionsTable thead th").data("sorter", true);
			//$("table").trigger("sorton", [[0,0]]);
            
        } else 
		{
            $("#transactionsTable thead th").data("sorter", true);
            $("#transactionsTable").tablesorter({
				textExtraction: {
					2: function(node, table, cellIndex){ return $(node).find("a").text(); },
				},
				widgets: [ 'scroller' ],
				widgetOptions : {
				  scroller_height : 500,
				},
                sortList: [[7, 1]]
            });

            tableLoaded = true;
        }
		if(displayedLogs)
			trigger1 = true;
		
		
        if(trigger1)
		{
			disableInput(false);
			hideLoading(true);
			running = false;
			requestID++;
			buttonLoading(true);
			downloadAllTrades();
		}
		else
		{
			hideLoading(trigger1);
		}
        tableLoaded = true;
    }


 // Builds the HTML Table out of myList.
	function buildHtmlTable(selector, myList, loaded, headers) 
	{
        var body = $(selector +' tbody');
        var columns = addAllColumnHeaders(myList, selector, loaded, headers);
        
        for (var i = 0; i < myList.length; i++) 
		{
			if(!showCustomTokens && myList[i].Unlisted)
					continue;
            var row$ = $('<tr/>');

            
            {
                for (var colIndex = 0; colIndex < columns.length; colIndex++) 
				{
					var head = columns[colIndex];
                    var cellValue = myList[i][head];
                    if (cellValue === null) cellValue = "";

					
					if(head == 'Amount' || head == 'Price' || head == 'Fee' || head == 'ETH')
					{
						if(head == 'Fee' && myList[i][columns[0]] == 'Maker')
						{
							cellValue = '';
						}
						
						if(cellValue !== "" && cellValue !== undefined)
						{
							var dec = fixedDecimals;
							if(head == 'Price')
								dec += 6;
							else if(head == 'Fee')
								dec += 2;
							var num = Number(cellValue).toFixed(dec);
							row$.append($('<td/>').html(num));
						}
						else
						{
							row$.append($('<td/>').html(cellValue));
						}
					}
					else if(head == 'Token' || head == 'FeeToken')
					{
						if(head == 'FeeToken' && myList[i][columns[0]] == 'Maker')
						{
							cellValue = '';
						}
						
						if(cellValue !== "" && cellValue !== undefined)
						{
							cellValue = cellValue.name;
							if( !myList[i].Unlisted)
								row$.append($('<td/>').html('<a  target="_blank" class="label label-primary" href="https://etherdelta.com/#' + cellValue + '-ETH">' + cellValue + '</a>'));
							else
								row$.append($('<td/>').html('<a target="_blank" class="label label-warning" href="https://etherdelta.com/#' + myList[i].Token.addr + '-ETH">' + cellValue + '</a>'));
							}
						else
						{
							row$.append($('<td/>').html(cellValue));
						}
						
					}
					else if(head == 'Type')
					{
						if(cellValue == 'Taker')
						{
							row$.append($('<td/>').html('<span class="label label-default" >' + cellValue + '</span>'));
						}
						else if(cellValue == 'Maker')
						{
							row$.append($('<td/>').html('<span class="label label-info" >' + cellValue + '</span>'));
						}
						else
						{
							row$.append($('<td/>').html('<span class="" >' + cellValue + '</span>'));
						}
					} 
					else if ( head == 'Trade')
					{
						if(cellValue == 'Buy')
						{
							row$.append($('<td/>').html('<span class="label label-success" >' + cellValue + '</span>'));
						}
						else if(cellValue == 'Sell')
						{
							row$.append($('<td/>').html('<span class="label label-danger" >' + cellValue + '</span>'));
						}
						else
						{
							row$.append($('<td/>').html('<span class="" >' + cellValue + '</span>'));
						}
					}
					else if( head == 'Hash')
					{
						row$.append($('<td/>').html('<a target="_blank" href="https://etherscan.io/tx/' + cellValue + '">'+ cellValue.substring(0,8)  + '...</a>'));
					}
					else if( head == 'Buyer' || head == 'Seller')
					{
						row$.append($('<td/>').html('<a target="_blank" href="https://etherscan.io/address/' + cellValue + '">'+ cellValue.substring(0,8)  + '...</a>'));
					}
					else if(head == 'Date')
					{
						if(cellValue !== '??')
							cellValue = formatDate(cellValue);
						row$.append($('<td/>').html(cellValue));
					}
					else if(head == 'Details')
					{
						
						row$.append($('<td/>').html('<a href="'+cellValue+'" target="_blank"> See details</a>'));
					}
					else
					{
						row$.append($('<td/>').html(cellValue));
					}
                }
            }
			
			body.append(row$);
        }
    }

	var tradeHeaders = {'Type': 1, 'Trade': 1, 'Token' : 1, 'Amount':1, 'Price':1, 'ETH': 1, 'Hash':1, 'Date':1, 'Buyer':1, 'Seller' : 1, 'Fee' : 1, 'FeeToken' : 1,'Details':1};
    // Adds a header row to the table and returns the set of columns.
    // Need to do union of keys from all records as some records may not contain
    // all records.
    function addAllColumnHeaders(myList, selector, loaded, headers) 
	{
        var columnSet = {};
		
		if(!loaded)
			$(selector + ' thead').empty();
		
        var header1 = $(selector + ' thead');
        var headerTr$ = $('<tr/>');

		if(!loaded)
		{
			header1.empty();
		}
		
        for (var i = 0; i < myList.length; i++) 
		{
            var rowHash = myList[i];
            for (var key in rowHash) 
			{
				if( !columnSet[key] && headers[key] ) 
				{
					columnSet[key] = 1;
					headerTr$.append($('<th/>').html(key));
				}
            }
        }
		if(!loaded)
		{
			header1.append(headerTr$);
			$(selector).append(header1);
		}
		columnSet = Object.keys(columnSet);
        return columnSet;
    }
		
	function toDateTime(secs)
	{
		var utcSeconds = secs;
		var d = new Date(0);
		d.setUTCSeconds(utcSeconds);
		return d; // formatDate(d);
	}
	
	function toDateTimeNow(short)
	{
		var t = new Date();
		return t;
		//return formatDate(t, short);
	}

	
	function createUTCOffset(date) {
		
		function pad(value) {
			return value < 10 ? '0' + value : value;
		}
		
		var sign = (date.getTimezoneOffset() > 0) ? "-" : "+";
		var offset = Math.abs(date.getTimezoneOffset());
		var hours = pad(Math.floor(offset / 60));
		var minutes = pad(offset % 60);
		return sign + hours + ":"+ minutes;
	}
	
	function formatDateOffset(d, short)
	{
		if(d == "??")
			return "??";
		
		if(short)
			return formatDate(d,short);
		else
			return formatDateT(d,short) + createUTCOffset(d);
	}
	
	function formatDate(d, short)
	{
		if(d == "??")
			return "??";
		
		var month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear(),
			hour = d.getHours(),
			min = d.getMinutes(),
			sec = d.getSeconds();
			

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		if (hour < 10) hour = '0' + hour;
		if (min < 10) min = '0' + min;
		if (sec < 10) sec = '0' + sec;

		if(!short)
			return [year, month, day].join('-') + ' '+ [hour,min,sec].join(':');
		else
			return [year, month, day].join('');
	}
	
	function formatDateT(d, short)
	{
		if(d == "??")
			return "??";
		
		var month = '' + (d.getMonth() + 1),
			day = '' + d.getDate(),
			year = d.getFullYear(),
			hour = d.getHours(),
			min = d.getMinutes();
			

		if (month.length < 2) month = '0' + month;
		if (day.length < 2) day = '0' + day;
		if (hour < 10) hour = '0' + hour;
		if (min < 10) min = '0' + min;

		if(!short)
			return [year, month, day].join('-') + 'T'+ [hour,min].join(':');
		else
			return [year, month, day].join('');
	}
	
	

	function divisorFromDecimals(decimals)
	{
		var result = 1000000000000000000;
		if (decimals !== undefined) 
		{
			result = Math.pow(10, decimals);
		}
		return new BigNumber(result);
	}
	
	function clearDownloads()
	{
		$('#downloadTrades').html('');
		$('#downloadBitcoinTaxTrades').html('');
		$('#downloadCointrackingTrades').html('');
		$('#downloadCointracking2Trades').html('');
	}
	
	
	function downloadAllTrades()
	{
		if(lastResult)
		{
			checkBlockDates(lastResult);
			
			downloadTrades();
			downloadBitcoinTaxTrades();
			downloadCointrackingTrades();
			downloadCointracking2Trades();
		}
	
	
	
	
		function downloadTrades()
		{
			//if(lastResult)
			{
			//	checkBlockDates(lastResult);
				var allTrades = lastResult;
				
				var A = [ ['Type', 'Trade', 'Token', 'Amount', 'Price (ETH)', 'Total ETH', 'Date', '', 'Transaction Hash', 'Buyer', 'Seller', 'Fee', 'FeeToken', 'Token Contract' ] ];  
				// initialize array of rows with header row as 1st item
				for(var i=0;i< allTrades.length;++i)
				{ 
					var arr = [allTrades[i]['Type'], allTrades[i]['Trade'], allTrades[i]['Token'].name, allTrades[i]['Amount'], allTrades[i]['Price'], 
								allTrades[i]['ETH'],  formatDateOffset(allTrades[i]['Date']), ' ', allTrades[i]['Hash'], allTrades[i]['Buyer'], allTrades[i]['Seller'], 
								allTrades[i]['Fee'], allTrades[i]['FeeToken'].name, allTrades[i]['Token'].addr];
					A.push(arr); 
				}
				var csvRows = [];
				for(var i=0,l=A.length; i<l; ++i){
					csvRows.push(A[i].join(','));   // unquoted CSV row
				}
				var csvString = csvRows.join("\r\n");

				var sp = document.createElement('span');
				sp.innerHTML = " ";
				var a = document.createElement('a');
				a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
				a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
				a.target   = '_blank';
				a.download = "TradeHistory_" + formatDate(toDateTimeNow(true), true) + '_' + publicAddr + ".csv";
				sp.appendChild(a);
				
				$('#downloadTrades').html('');
				var parent = document.getElementById('downloadTrades');
				parent.appendChild(sp);
				//parent.appendCild(a);
				
			}
		}
			
		function downloadBitcoinTaxTrades()
		{
			//if(lastResult)
			{
				//checkBlockDates(lastResult);
				var allTrades = lastResult;
				
				var A = [ ['Date', 'Action', 'Source', 'Volume', 'Symbol', 'Price', 'Currency', 'Fee', 'FeeCurrency', 'Total', 'Memo'] ]; 
				// initialize array of rows with header row as 1st item
				for(var i=0;i< allTrades.length;++i)
				{ 
					if(allTrades[i]['Trade'] === 'Buy') {
						var arr = [formatDateOffset(allTrades[i]['Date']), allTrades[i]['Trade'].toUpperCase(), 'EtherDelta', allTrades[i]['Amount'], allTrades[i]['Token'].name, allTrades[i]['Price'], 'ETH',
								allTrades[i]['Fee'], allTrades[i]['FeeToken'].name,  allTrades[i]['ETH'], " Transaction Hash " + allTrades[i]['Hash'] + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr];
						A.push(arr); 
					}
					// add token fee to total for correct balance in bitcoin tax
					else {
						var arr = [formatDateOffset(allTrades[i]['Date']), allTrades[i]['Trade'].toUpperCase(), 'EtherDelta', allTrades[i]['Amount'] + allTrades[i]['Fee'], allTrades[i]['Token'].name, allTrades[i]['Price'], 'ETH',
								allTrades[i]['Fee'], allTrades[i]['FeeToken'].name,  allTrades[i]['ETH'], " Transaction Hash " + allTrades[i]['Hash'] + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr];
						A.push(arr); 
					}
				}
				var csvRows = [];
				for(var i=0,l=A.length; i<l; ++i){
					csvRows.push(A[i].join(','));   // unquoted CSV row
				}
				var csvString = csvRows.join("\r\n");

				var sp = document.createElement('span');
				sp.innerHTML = " ";
				var a = document.createElement('a');
				a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
				a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
				a.target   = '_blank';
				a.download = 'BitcoinTax_'+ formatDate(toDateTimeNow(true), true) + '_' + publicAddr + ".csv";
				sp.appendChild(a);
				
				$('#downloadBitcoinTaxTrades').html('');
				var parent = document.getElementById('downloadBitcoinTaxTrades');
				parent.appendChild(sp);
				//parent.appendCild(a);
				
			}
			
		}
		
		//csv columns
		function downloadCointrackingTrades()
		{
			//if(lastResult)
			{
				//checkBlockDates(lastResult);
				var allTrades = lastResult;
				
				var A = [ ['\"Type\"', '\"Buy\"', '\"Cur.\"', '\"Sell\"', '\"Cur.\"', '\"Fee\"', '\"Cur.\"', '\"Exchange\"','\"Group\"', '\"Comment\"', '\"Trade ID\"', '\"Date\"'] ]; 
				// initialize array of rows with header row as 1st item
				for(var i=0;i< allTrades.length;++i)
				{ 
						var arr = [];
						if(allTrades[i]['Trade'] === 'Buy') {
							arr = ['Trade', allTrades[i]['Amount'], allTrades[i]['Token'].name, allTrades[i]['ETH'], 'ETH', allTrades[i]['Fee'], allTrades[i]['FeeToken'].name, 
							'EtherDelta','', 'Hash: ' + allTrades[i]['Hash']  + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr, allTrades[i]['Hash'], formatDate(allTrades[i]['Date'])];
								
						}
						else {
							arr = ['Trade', allTrades[i]['ETH'], 'ETH', allTrades[i]['Amount'], allTrades[i]['Token'].name, allTrades[i]['Fee'], allTrades[i]['FeeToken'].name, 
							'EtherDelta', '', 'Hash: ' + allTrades[i]['Hash'] + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr, allTrades[i]['Hash'], formatDate(allTrades[i]['Date'])];
						} 
						
						for(let i = 0; i < arr.length; i++)
						{
							arr[i] = `\"${arr[i]}\"`;
						}
						
						A.push(arr); 
				}
				var csvRows = [];
				for(var i=0,l=A.length; i<l; ++i){
					csvRows.push(A[i].join(','));   // unquoted CSV row
				}
				var csvString = csvRows.join("\r\n");

				var sp = document.createElement('span');
				sp.innerHTML = " ";
				var a = document.createElement('a');
				a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
				a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
				a.target   = '_blank';
				a.download = 'Cointracking_CSV_'+ formatDate(toDateTimeNow(true), true) + '_' + publicAddr + ".csv";
				sp.appendChild(a);
				
				$('#downloadCointrackingTrades').html('');
				var parent = document.getElementById('downloadCointrackingTrades');
				parent.appendChild(sp);
				//parent.appendCild(a);
				
			}
			
		}
		
		//custom exchange columns
		function downloadCointracking2Trades()
		{
			//if(lastResult)
			{
				//checkBlockDates(lastResult);
				var allTrades = lastResult;
				
				var A = [ [ '\"Date\"', '\"Buy\"', '\"Cur.\"', '\"Sell\"', '\"Cur.\"', '\"Fee\"', '\"Cur.\"', '\"Trade ID\"', '\"Comment\"', '\"Exchange\"', '\"Type\"'] ]; 
				
				// initialize array of rows with header row as 1st item
				for(var i=0;i< allTrades.length;++i)
				{ 
						var arr = [];
						if(allTrades[i]['Trade'] === 'Buy') {
							arr = [formatDateOffset(allTrades[i]['Date']), allTrades[i]['Amount'], allTrades[i]['Token'].name, allTrades[i]['ETH'], 'ETH', allTrades[i]['Fee'], allTrades[i]['FeeToken'].name, 
							allTrades[i]['Hash'], 'Hash: ' + allTrades[i]['Hash']  + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr, formatDateOffset(allTrades[i]['Date']), 'EtherDelta','Trade'];
								
						}
						else {
							arr = [formatDateOffset(allTrades[i]['Date']), allTrades[i]['ETH'], 'ETH', allTrades[i]['Amount'], allTrades[i]['Token'].name, allTrades[i]['Fee'], allTrades[i]['FeeToken'].name, 
							allTrades[i]['Hash'], 'Hash: ' + allTrades[i]['Hash'] + " -- " + allTrades[i]['Token'].name + " token contract " + allTrades[i]['Token'].addr, 'EtherDelta','Trade'];
						} 
						
						for(let i = 0; i < arr.length; i++)
						{
							arr[i] = `\"${arr[i]}\"`;
						}
						A.push(arr); 
				}
				var csvRows = [];
				for(var i=0,l=A.length; i<l; ++i){
					csvRows.push(A[i].join(','));   // unquoted CSV row
				}
				var csvString = csvRows.join("\r\n");

				var sp = document.createElement('span');
				sp.innerHTML = " ";
				var a = document.createElement('a');
				a.innerHTML = '<i class="fa fa-download" aria-hidden="true"></i>';
				a.href     = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvString);
				a.target   = '_blank';
				a.download = 'Cointracking_CustomExchange_'+ formatDate(toDateTimeNow(true), true) + '_' + publicAddr + ".csv";
				sp.appendChild(a);
				
				$('#downloadCointracking2Trades').html('');
				var parent = document.getElementById('downloadCointracking2Trades');
				parent.appendChild(sp);
				//parent.appendCild(a);
				
			}
			
		}
	}
	
	function placeholderTable()
	{
		var result = transactionsPlaceholder;
		makeTable(result);
	}
	
	function escapeHtml(text) {
	  var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	  };

		return text.replace(/[&<>"']/g, function(m) { return map[m]; });
	}

}