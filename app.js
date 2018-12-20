var map;
var resources = [];
var uuids = [];
var segmentos = [];
var ruas = [];
var ctx;
var tabela;

/**
 * Definicao dos principais eventos necessarios para controlar o fluxo da aplicacao
 */
function preparaAmbienteHistorico(){
	moment.locale('pt-br');
	$("#flow").on("montaeixos", function(event, data, label){
		montaEixos( data, label);
	});
	$( "#streets" ).on("change",function(event, recurso) {
		montaComboSegmentos(recurso);
	});
	$("#historico").on("click", function(event,dados){
		atualizaHistorico();
	});
}

function preparaAmbienteSmart(){
	moment.locale('pt-br');
	$("#flow").on("interscity", function(event, uuid, data){
		desenhaUuid( uuid, data);
	});
	$("#flow").on("tabela", function(event){
		criaTabela();
	});
	$("#flow").on("montaeixos", function(event, dados, label){
		MontaEixos(dados, label);
	});
	$("#atualiza").on("click", function(e, dados){
		data = moment( $("#data").val(),"DD/MM/YYYY HH:mm");
		atualizaMapa(data);
	});
	
	smartTrafficDateSlider();
	$("#data").val(moment().format("DD/MM/YYYY HH:00"));
	tabela = $("#tabelasegmentos").DataTable({
	}); 
}

/**
 * Serializa os parametros passados via URL. Necessario para saber se o historico sera de
 * um UUID ou de uma rua (a rua tem precedencia sobre um UUID, caso sejam passados os 2
 * @returns {Object} variavel contendo todos os parametros passados na URL 
 */
function buscaParametros(){
	var parametros={};
	if (document.location.toString().indexOf('?') !== -1) {
		var query = document.location.toString()
		// get the query string
		.replace(/^.*?\?/, '')
		// and remove any existing hash string (thanks, @vrijdenker)
		.replace(/#.*$/, '').split('&');

		for (var i = 0, l = query.length; i < l; i++) {
			var aux = decodeURIComponent(query[i]).split('=');
			parametros[aux[0]] = aux[1];
		}
	}
	return(parametros);
}

/**
 * No carregamento inicial, preenche as datepickers com a data atual, e 1 dia pra trás
 * padrão a ser utilizado no desenho do grafico historico 
 * @param inicial
 * @param dtFinal
 * @returns
 */
function preencheData(inicial = null, dtFinal = null){
	// Get 1 day in milliseconds
	var one_day=1000*60*60*24;
	if(inicial == null){
		var dataFinal = new Date();
		var dataFinalMenosUm = moment(dataFinal.getTime() - one_day);
		dataFinal = moment(dataFinal);
		var dataInicial = moment(new Date(dataFinalMenosUm));
		$("#datainicial").val(dataInicial.format("DD/MM/YYYY"));
		$("#datafinal").val(dataFinal.format("DD/MM/YYYY"));
	}
}

/**
 * callback do click do botao historico
 * para atualizar o grafico do historico
 * pega as datas que estao no slider
 * verifica quais selecoes estao nos combos street e segmentos
 * e efetua a busca dos segmentos
 */
function atualizaHistorico(){
	var values;
	if($("#segmentos" ).val()=="0"){
		var options = $('#segmentos option');
		values = $.map(options ,function(option) {
		    return option.value;
		});
		values.shift();
	}else{
		values = [$("#segmentos").val()];
	}
	montaGrafico(values);
}

function initMap(){
	
	map = new google.maps.Map(document.getElementById('map-container'), {
		zoom: 11,
		center: {lat: 41.90, lng: -87.80},
		mapTypeId: 'roadmap'
	});
	google.maps.event.addListenerOnce(map, 'idle', function(){
	    carregaMapa();
	});
}


function corTrafego(speed){
	if(speed <= 10){
		return '#FF0000';
	}
	if( (speed > 10) && (speed <=20)){
		return '#FFFF00';
	}
	if( speed > 20){
		return '#008000';
	}

}		

function desenhaSegmento(fromLat, fromLon, toLat, toLon, speed) {
        
	var segment = [
	  {lat: parseFloat(fromLat), lng: parseFloat(fromLon)},
	  {lat: parseFloat(toLat), lng: parseFloat(toLon)}
	];
	var segPath = new google.maps.Polyline({
	  path: segment,
	  geodesic: true,
	  strokeColor: corTrafego(speed),
	  strokeOpacity: 1.0,
	  strokeWeight: 2
	});
	segPath.setMap(map);
}


function preencheLinhaTabela(id, street, segmento, speed, uuid){
	tabela.row.add([
		'<a href="historico.html?uuid='+uuid+'">' + id + '</a>',
		'<a href="historico.html?street='+street+'">' + street + '</a>',
		'<a href="historico.html?uuid='+uuid+'">' + segmento + '</a>',
		speed
	]).draw();
	//$( "#segmentos-body" ).append( '<tr><td><a href="historico.html?uuid='+uuid+'">' + id + '</a></td><td><a href="historico.html?street='+street+'">' + street + '</a></td><td><a href="historico.html?uuid='+uuid+'">' + segmento + '</a></td><td>' + speed + '</td></tr>' );
}


function montaEixos(dados, label){

	window.myLine.destroy();
	
	dia = Object.keys(dados)
	velocidade = Object.values(dados)
	
	var config = {
		type: 'line',
		data: {
			labels: dia,
			datasets: [{
				label: label,
				backgroundColor: getRandomColor(),
				data: velocidade,
				fill: false,
			}]
		},
		options: {
			responsive: true,
			title: {
				display: true,
				text: 'Gráfico de Velocidade(MPH) X Hora do dia'
			},
			tooltips: {
				mode: 'index',
				intersect: false,
			},
			hover: {
				mode: 'nearest',
				intersect: true
			},
			scales: {
				xAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Período'
					}
				}],
				yAxes: [{
					display: true,
					scaleLabel: {
						display: true,
						labelString: 'Velocidade (MPH)'
					},
					ticks: {
	                    beginAtZero:true
	                }
				}]
			}
		}
	};	
	window.myLine = new Chart(ctx, config);
	
}

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function cmp(a, b) {
    return a[0]-b[0];
}


function montaComboRuas(parametro=null){
	ruas = resources.map(function(value,index) { return value[1]; });
	var ruas_unicas = ruas.filter( onlyUnique );
	$( "#streets" ).append( '<option value="0">Selecione...</option>' );
	$.each(ruas_unicas, function(index, item) {
		$( "#streets" ).append( '<option value="'+item+'">'+item+'</option>' );
	});
	$("#streets").val(0);
	if(typeof parametro['uuid'] !== "undefined"){
		recurso = uuids.findIndex(checkUuid, parametro['uuid']);
		$("#streets").val(resources[recurso][1]);
		$("#streets").trigger("change", parametro['uuid']);
	}
	if(typeof parametro['street'] !== "undefined"){
		$("#streets").val(parametro['street']);
		$("#streets").trigger("change", -1);
	}
}


function onlyUnique(value, index, self) { 
    return self.indexOf(value) === index;
}


function montaComboSegmentos(uuid){
	$( "#streets option:selected" ).each(function() {
		$( "#segmentos" ).html('');
		var rua = $( this ).text();
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'chicago-local.db', true);
		xhr.responseType = 'arraybuffer';
		xhr.onload = function() {
			var data = new Uint8Array(this.response);
			var db = new SQL.Database(data);
			var dadosResource = db.exec('SELECT * FROM resource r, uuid_segmentid u WHERE street LIKE "%'+rua +'%" AND r.segmentid = u.segmentid;');
			$( "#segmentos" ).append( '<option value="0">Todos</option>' );
			$.each(dadosResource[0].values, function(index, item) {
				$( "#segmentos" ).append( '<option value="'+item[9]+'">'+item[2]+'-'+item[3]+'</option>' );	
			});
			$("#segmentos").val(0);
			if(uuid!=null){
				$("#segmentos").val(uuid);
			}
			if(uuid==-1){
				$("#historico").trigger("click");
			}
		};
		xhr.send();
		
    });
}

function carregaMapa(){
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'chicago-local.db', true);
	xhr.responseType = 'arraybuffer';
	xhr.onload = function() {
		var data = new Uint8Array(this.response);
		var db = new SQL.Database(data);
		var dadosResource = db.exec("SELECT * FROM resource ORDER BY segmentid");
		var dadosUuid = db.exec("SELECT uuid FROM uuid_segmentid ORDER BY segmentid");
		
		resources = dadosResource[0].values.slice();
		uuids = dadosUuid[0].values.slice();
				
		$.each(uuids, function(index, item) {
			desenhaUuid(index, item, null);
		});		
	};
	xhr.send();
}

function desenhaUuid(index, uuid, dataInicial=null){
	var capability_json;
	var data = new moment(dataInicial);
	var url;
	if(dataInicial == null){
		capability_json = '{"capabilities":["traffic_speed"]}';
		url = "http://localhost:8000/collector/resources/"+uuid+"/data/last";
	}else{
		var dataFinal = data.add(1, 'hours');
		capability_json = '{"capabilities":["traffic_speed"],"start_date":"'+dataInicial.format("YYYY-MM-DDTHH:mm:ss")+'","end_date":"'+dataFinal.format("YYYY-MM-DDTHH:mm:ss")+'"}';
		url = "http://localhost:8000/collector/resources/"+uuid+"/data";
	}
	$.ajax({
		type: "POST",
		dataType: "json",
		contentType: 'application/json',
		data: capability_json,
		url: url
	}).then(function(data) {
		if(data.resources.length>0){
			v = data.resources[0].capabilities.traffic_speed[0].traffic_speed;
			var street = resources[index][1];
			var segmento = resources[index][2]+"-"+resources[index][3];
			if(v > 0){
				preencheLinhaTabela(resources[index][0], street, segmento, v, uuid);
				desenhaSegmento(resources[index][6], resources[index][4], resources[index][7], resources[index][5], v);
			}
		}
	});
}


function atualizaMapa(data = null){
	
	//$( "#segmentos-body" ).empty();
	tabela.clear();
	$.each(uuids, function(index, item) {
		desenhaUuid(index, item, data);
	});
	//tabela.draw();
}


function criaTabela(){
	tabela = $("#tabelasegmentos").DataTable({
		"bDestroy":true
	});
}

//recebe um array com uuids para pesquisa
//dispara o evento montaeixo, passando como parametros os valores medios de velocidade
//e um label para o grafico 

function montaGrafico(uuid){
	var dados=[];
	var datas = [];
	var dataInicial = moment($("#datainicial").val(), "DD/MM/YYYY HH:mm:ss");
	var dataFinal = moment($("#datafinal").val(), "DD/MM/YYYY HH:mm:ss");
	var uuid_string = JSON.stringify(uuid);
	var num_segmentos = uuid.length;
	recurso = uuids.findIndex(checkUuid, uuid[0]);
	var label=resources[recurso][1]+'-'+resources[recurso][2]+'-'+resources[recurso][3];
	capability_json = '{"uuids":'+uuid_string+' ,"capabilities":["traffic_speed"],"start_date":"'+dataInicial.format("YYYY-MM-DDTHH:mm:ss")+'","end_date":"'+dataFinal.format("YYYY-MM-DDT23:59:ss")+'"}';
	if(num_segmentos>1){
		label = resources[recurso][1];
		//var sql ='"SELECT resource.* FROM uuid_segmentid, resource WHERE uuid_segmentid.uuid ="'+uuid[0]+'" AND resource.segmentid = uuid_segmentid.segmentid"';
	}
	$.ajax({
		type: "POST",
		dataType: "json",
		contentType: 'application/json',
		data: capability_json,
		url: "http://localhost:8000/collector/resources/data"
	}).then(function(data) {
		var valores={};
		$.each(data.resources, function (index, item){
			$.each(item.capabilities.traffic_speed, function (idx, it){
				var d = moment(it.date, "YYYY-MM-DDTHH:mm");
				if ( valores[d.format("DD/MM/YYYY-HH:00")] === undefined ){
					valores[d.format("DD/MM/YYYY-HH:00")] = it.traffic_speed;
				}else{
					valores[d.format("DD/MM/YYYY-HH:00")] = valores[d.format("DD/MM/YYYY-HH:00")]+it.traffic_speed;
				}
			})
		})
		$.each(valores, function (index, item){
			valores[index] =valores[index]/num_segmentos; 
		});
		$("#flow").trigger("montaeixos", [valores, label]);
	});
}


function criaDateRangeSlider(){
	var Months = [ "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul",
		"Ago", "Set", "Out", "Nov", "Dez" ];
	var agora = new Date();
	$("#dateslider").dateRangeSlider({
		bounds : {
			min : new Date(agora.getFullYear(),agora.getMonth(),1,0,0,0),
			max : agora
		},
		defaultValues : {
			min : new Date(agora.getFullYear(),agora.getMonth(),agora.getDate() - 1,0,0,0),
			max : new Date()
		},
		scales : [ {
			next : function(val) {
				var next = new Date(val);
				return new Date(next.setMonth(next.getMonth() + 1));
			},
			label : function(val) {
				return Months[val.getMonth()];
			}
		} ],
		step:{
		    days: 1
		  }
	});
	
	// Preferred method
	$("#dateslider").on("valuesChanging", function(e, data){
		//moment($("#datainicial").val(moment(data.values.min).format("DD/MM/YYYY HH:mm")));
		moment($("#datainicial").val(moment(data.values.min).format("DD/MM/YYYY")));
		//moment($("#datafinal").val(moment(data.values.max).format("DD/MM/YYYY HH:mm")));
		moment($("#datafinal").val(moment(data.values.max).format("DD/MM/YYYY")));
	});
}


function smartTrafficDateSlider(){
	var agora = new Date();
	var Months = [ "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul",
		"Ago", "Set", "Out", "Nov", "Dez" ];
	$("#slider").dateRangeSlider({
		bounds : {
			min : new Date(agora.getFullYear(),agora.getMonth(),1,0,0,0),
			max : agora
		},
		defaultValues : {
			min : new Date(agora.getFullYear(),agora.getMonth(),1,0,0,0),
			max : agora
		},
		scales : [ {
			next : function(val) {
				var next = new Date(val);
				return new Date(next.setMonth(next.getMonth() + 1));
			},
			label : function(val) {
				return Months[val.getMonth()];
			}
		} ],
		step:{
		    hours: 1
		  },
		  formatter:function(val){
	        var days = val.getDate(),
	          month = val.getMonth() + 1,
	          year = val.getFullYear(),
	          hour = val.getHours(),
	          minute = String(val.getMinutes()).padStart(2, "0");
	        return days + "/" + month + "/" + year + "-" + hour + ":" + minute;
	      },
	      enabled: false
	});

	// Preferred method
	$("#slider").on("valuesChanging", function(e, data){
		moment($("#data").val(moment(data.values.max).format("DD/MM/YYYY HH:mm")));
	});
}

//recebe um object que nas keys contem as dadtas e values as velocidades
//deve retornar um novo object com as keys contendo as 24h dos dias
//caso nao possua um valor para a hora específica, jogar 0;
//substituir -1 por 0
function preencheEspaco24h(dados){

	var dados24 = Object.assign(dados);
	console.log(dados24);
	
	return(dados24);
}


//funcao para comparacao com findIndex para achar o indice no vetor recurso
function checkUuid(uuid){
	if(uuid[0] == this) return true;
	return false;
}







( function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define( [ "../widgets/datepicker" ], factory );
	} else {

		// Browser globals
		factory( jQuery.datepicker );
	}
}
( function( datepicker ) {

	datepicker.regional[ "pt-BR" ] = {
		closeText: "Fechar",
		prevText: "&#x3C;Anterior",
		nextText: "Próximo&#x3E;",
		currentText: "Hoje",
		monthNames: [ "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
		"Julho","Agosto","Setembro","Outubro","Novembro","Dezembro" ],
		monthNamesShort: [ "Jan","Fev","Mar","Abr","Mai","Jun",
		"Jul","Ago","Set","Out","Nov","Dez" ],
		dayNames: [
			"Domingo",
			"Segunda-feira",
			"Terça-feira",
			"Quarta-feira",
			"Quinta-feira",
			"Sexta-feira",
			"Sábado"
		],
		dayNamesShort: [ "Dom","Seg","Ter","Qua","Qui","Sex","Sáb" ],
		dayNamesMin: [ "Dom","Seg","Ter","Qua","Qui","Sex","Sáb" ],
		weekHeader: "Sm",
		dateFormat: "dd/mm/yy",
		firstDay: 0,
		isRTL: false,
		showMonthAfterYear: false,
		yearSuffix: "" };
	datepicker.setDefaults( datepicker.regional[ "pt-BR" ] );

	return datepicker.regional[ "pt-BR" ];

} ) );