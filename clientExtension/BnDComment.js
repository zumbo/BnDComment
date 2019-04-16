var prefix = window.location.pathname.substr(0, window.location.pathname.toLowerCase().lastIndexOf("/extensions") + 1);
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};

var currentUser;
var oldFontSize;
var oldCommentView = null;
var oldCommentLevel = null;
var rendered;
var editMode = 0;
var oldCommentRef;
var ref;
var oldRef;

define([
	'qlik',
	'jquery',
	'text!./bndComment.html',
	'text!./leonardo-ui.css',
	'text!./bndComment.css',
	'./restapi',
	'./leonardo-ui',
	'./properties'
],
	function (qlik, $, html, leoCss, bndcCss, restApi, leoJs, prop) {
		return {
			definition: prop,
			support: {
				snapshot: true,
				export: true,
				exportData: true
			},
			paint: async function ($element, layout) {
				
				if (window['oldFontSize' + layout.qInfo.qId] != layout.fontSize) {
					$(`#bndcCss_${layout.qInfo.qId}`).remove();
					css = bndcCss.replace(/fontVariable/g, layout.fontSize);
					css = bndcCss.replace(/fontVariable/g, layout.fontSize);
					css = css.replace(/LAYOUTID/g, layout.qInfo.qId);
					$(`<style id="bndcCss_${layout.qInfo.qId}">`).html(css).appendTo("head");
					window['oldFontSize' + layout.qInfo.qId] = layout.fontSize;
				}

				if(window['oldCommentView' + layout.qInfo.qId] != layout.commentView) {
					if(window['oldCommentRef' + layout.qInfo.qId]) {
						window['oldCommentRef' + layout.qInfo.qId].off();
					}
					$element.empty();
					window['oldCommentView' + layout.qInfo.qId] = layout.commentView;
				}
				var bndcIconPanel = $('#bndcIconPanel_' + layout.qInfo.qId);

				if (!bndcIconPanel.length) {
					
					window['oldCommentRef' + layout.qInfo.qId] = null;
					window['commentRef' + layout.qInfo.qId] = null;
					window['ref' + layout.qInfo.qId] = null;
					window['oldRef' + layout.qInfo.qId] = null;
					finalHtml = html.replace(/LAYOUTID/g, layout.qInfo.qId);
					$element.append(finalHtml);
					
					// Get current user
					var global = qlik.getGlobal(config);
					global.getAuthenticatedUser(function (reply) {
						currentUser = reply.qReturn;
						currentUser = currentUser.replace('UserDirectory=', '');
						currentUser = currentUser.replace('; UserId=', '_');
						currentUser = currentUser.replace('\\', '_');
					});

					// On click plus icon
					$('#addButton_' + layout.qInfo.qId).click(function () {
						$('#editButton_' + layout.qInfo.qId).hide();
						$('#bndcTextArea_' + layout.qInfo.qId).val('');
						$('#bndcContainer_' + layout.qInfo.qId).show();
						$('#addButton_' + layout.qInfo.qId).hide();
						$('#bndcContent_' + layout.qInfo.qId).hide();
					});


					// On click edit icon
					$('#editButton_' + layout.qInfo.qId).click(function () {
						editMode = 1;
						$('#editButton_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).hide();
						$('#closeButton_' + layout.qInfo.qId).show();
						// add delete icon to comments made by current user
						
						$("*[id*=" + currentUser + "]:visible").each(function () {
							$(this).find('.lui-icon.lui-icon--bin').show();
						});
						// On click delete icon callback
						$(".lui-icon.lui-icon--bin").click(async function () {
							var ts = $(this)[0].parentElement.id;
							var tsSplit = ts.split('_');
							var id = tsSplit[2];
							deleteComments(id);
						})
					});

					// On click close button
					$('#closeButton_' + layout.qInfo.qId).click(function () {
						editMode = 0;
						$('#editButton_' + layout.qInfo.qId).show();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#closeButton_' + layout.qInfo.qId).hide();
						$(".lui-icon.lui-icon--bin").hide();
					});

					// On click cancel button
					$('#cancelButton_' + layout.qInfo.qId).click(function () {
						$('#editButton_' + layout.qInfo.qId).show();
						$('#bndcContainer_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#bndcContent_' + layout.qInfo.qId).show();
					});

					// On click save button write to DB
					$('#saveButton_' + layout.qInfo.qId).click(async function () {
						milliseconds = await (new Date).getTime();
						comments = await writeNewComment(milliseconds, currentUser, $('#bndcTextArea_' + layout.qInfo.qId).val());
						$('#bndcContainer_' + layout.qInfo.qId).hide();
						$('#addButton_' + layout.qInfo.qId).show();
						$('#bndcContent_' + layout.qInfo.qId).show();
						$('#editButton_' + layout.qInfo.qId).show();
					});

					// On click radio buttons
					$(`#green_${layout.qInfo.qId}`).click(function () {
						if ($(`#green_${layout.qInfo.qId}`).hasClass("green_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 1);
						}

					})
					$(`#yellow_${layout.qInfo.qId}`).click(function () {
						if ($(`#yellow_${layout.qInfo.qId}`).hasClass("yellow_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 2);
						}
					})
					$(`#red_${layout.qInfo.qId}`).click(function () {
						if ($(`#red_${layout.qInfo.qId}`).hasClass("red_" + layout.qInfo.qId)) {
							writeNewComment(null, currentUser, 0);
						}
						else {
							writeNewComment(null, currentUser, 3);
						}
					})

					// Get current app and appid
					var app = qlik.currApp(this);
					var appId = app.id.replace(/\./g, "_");

					// Get notified about a new selection and retrieve new data and show it
					async function getSelections() {
						window['ref' + layout.qInfo.qId] = await createDbRefs(null);
						if (JSON.stringify(window['oldRef' + layout.qInfo.qId]) !== JSON.stringify(window['ref' + layout.qInfo.qId])) {
							window['oldRef' + layout.qInfo.qId] = window['ref' + layout.qInfo.qId];
							await clearContent();
							await createCommentView();
							getComments();
						}
					}

					// Call getSelections when new selection is made
					app.getList("SelectionObject", function () {
						getSelections();
					});

					// Function to get current selections within the app. A generic object is created to acheive this
					function getCurrentSelections() {
						return new Promise(function (resolve, reject) {
							app.createGenericObject({
								currentSelections: {
									qStringExpression: "=GetCurrentSelections('', '', '', 100)"
								}
							}, function (reply) {
								currentSelections = encodeURIComponent(reply.currentSelections);
								currentSelections = currentSelections.replace(/\./g, '%2E')
								resolve(currentSelections);
							});
						});
					}

					// Function to get the selections of particular dimensions (only used when the comment level is using a selected dimension)
					function createSelectionKey() {
						return new Promise(async function (resolve, reject) {
							var dimensions = layout.qHyperCube.qDimensionInfo;
							var selectionKey = '';
							for (let dim of dimensions) {
								//console.log('dim: ' + dim.qGroupFieldDefs[0]);
								var fieldSelection = await getFieldSelections(dim.qGroupFieldDefs[0]);
								if (selectionKey != '') {
									selectionKey += '|';
								}
								selectionKey += fieldSelection;
							}
							console.log('sel: ' + selectionKey);
							resolve(selectionKey);
						})
					}

					// Creating generic object which returns field selection
					function getFieldSelections(dim) {
						return new Promise(function (resolve, reject) {
							app.createGenericObject({
								fieldSelection: {
									qStringExpression: `=GetFieldSelections([${dim}],'',100)`								}
							}, function (reply) {
								fieldSelection = encodeURIComponent(reply.fieldSelection);
								resolve(fieldSelection);
							});
						});
					}

					// Function to retrieve comments and show them in the table
					function getComments() {
						restApi.read(window['ref' + layout.qInfo.qId].readRef, refreshComments, onDbError);
					}
					
					async function onDbError() {
						await clearContent();
						await createCommentView();
						errorMessage = 'Keine Datenbankverbindung!';

						if (layout.commentView == 'dt'|| layout.commentView == 'st') {
							$("#bndcTable_" + layout.qInfo.qId).append(
								'<tr>' +
								'<td class="bndcTdLeft_' + layout.qInfo.qId + '">' + errorMessage + '</td>' +
								'</tr>');
						} else if (layout.commentView == 'stb') {
							$("#bndcUl_" + layout.qInfo.qId).append('<li class="bndcLi_' + layout.qInfo.qId + '">' + errorMessage + '</li><br>');
						}
					}
					
					function formatKey(key) {
					    key = decodeURI(key);
						
						var lastSeparator = key.lastIndexOf('_');
						if (lastSeparator != -1) {
							key = key.substring(lastSeparator + 1);
						}
						
						if (key.startsWith('--')) {
							key = key.substring(2);
						} 
						if (key.endsWith('--')) {
							key = key.substring(0, key.length - 2);
						}
						
						return key;
					}
					
					function formatDate(time) {
						var date = new Date(time);
						var year = date.getFullYear();
						var month = (date.getMonth() + 1).toString().padStart(2, '0');
						var day = date.getDate().toString().padStart(2, '0');
						var hours = date.getHours().toString().padStart(2, '0');
						var minutes = date.getMinutes().toString().padStart(2, '0');
						return year + "-" + month + "-" + day + " " + hours + ":" + minutes;
					}
		
					async function refreshComments(reply) {
						// First emply table
						await clearContent();
						await createCommentView();

						// Loop through comments and append the table
						reply.data.forEach(function (node) {

							if (layout.commentView == 'dt') {
								$("#bndcTable_" + layout.qInfo.qId).append(
									'<tr>' +
									'<td class="bndcTdLeft_' + layout.qInfo.qId + '">' + formatKey(node.key) + '</td>' +
									'<td class="bndcTd_' + layout.qInfo.qId + '">' + node.user + '</td>' +
									'<td class="bndcTd_' + layout.qInfo.qId + '">' + node.comment + '</td>' +
									'<td class="bndcTd_' + layout.qInfo.qId + '"id=' + node.user + '_' + node._id + '>' + formatDate(node.time) + '&nbsp&nbsp' + '</td>' +
									'</tr>');
							}
							else if (layout.commentView == 'st') {
								$("#bndcTable_" + layout.qInfo.qId).append(
									'<tr>' +
									'<td class="bndcTdLeft_' + layout.qInfo.qId + '" id=' + node.user + '_' + node._id + '>' + node.comment + '&nbsp&nbsp' + '</td>' +
									'</tr>');
							}

							else if (layout.commentView == 'stb') {
								$("#bndcUl_" + layout.qInfo.qId).append('<li class="bndcLi_' + layout.qInfo.qId + '" id=' + node.user + '_' + node._id + '>' + '&nbsp&nbsp' +
									node.comment + '</li><br>');
							}
							$('#' + node.user + '_' + node._id).append('<span class="lui-icon lui-icon--bin" aria-hidden="true" style="display: none;"></span>');

							if (node.user == currentUser && editMode == 1) {
								$('#' + node.user + '_' + node._id).find('.lui-icon.lui-icon--bin').show();
								// On click delete icon callback
								$(".lui-icon.lui-icon--bin").click(function () {
									var ts = $(this)[0].parentElement.id;
									var tsSplit = ts.split('_');
									var id = tsSplit[2];
									deleteComments(id);
								})
							}
						})
					}

					// Delete comments
					async function deleteComments(id) {
						restApi.delete(id, getComments);
					}

					// Function to clear contents of table/textbox
					function clearContent() {
						return new Promise(function(resolve, reject){
							resolve($('#bndcContent_' + layout.qInfo.qId).empty());
						})
					}

					// Function to create table header
					function createCommentView() {
						if (layout.commentView == 'dt') {
							$('#bndcContent_' + layout.qInfo.qId).append(
							'<table id="bndcTable_' + layout.qInfo.qId + '" class="bndc-table_' + layout.qInfo.qId + '"><tr>' +
							'<th class="bndcThLeft_' + layout.qInfo.qId + '">Key</th>' +
							'<th class="bndcTh_' + layout.qInfo.qId + '">User</th>' +
							'<th class="bndcTh_' + layout.qInfo.qId + '">Comments</th>' +
							'<th class="bndcTh_' + layout.qInfo.qId + '">Time</th></tr></table>');
						}
						else if (layout.commentView == 'st') {
							$('#bndcContent_' + layout.qInfo.qId).append('<table id="bndcTable_' + layout.qInfo.qId + '" class="bndc-table_' + layout.qInfo.qId + '"><tr><th class="bndcThLeft_' + layout.qInfo.qId + '">Comment</th></tr>');
						}
						else if (layout.commentView == 'stb') {
							$('#bndcContent_' + layout.qInfo.qId).append('<p id="bndcP_' + layout.qInfo.qId + '" class="bndcP_' + layout.qInfo.qId + '"><ul id="bndcUl_' + layout.qInfo.qId + '"></ul></p>');
						}
					}

					// Function to create a new comment
					async function writeNewComment(time, user, comment) {
						ref = await createDbRefs(null);
						restApi.write({
								key: ref.createRef,
								user: user,
								comment: comment
							},
							getComments
						);
					}
				}

				// Function to create the correct database refs based on comment level property in extension
				async function createDbRefs(id) {
					var ref = '';
					// Create current time field
					var time = await (new Date).getTime();
					currentSelections = await getCurrentSelections();
					currentDimensionSelections = await createSelectionKey();
				
					if (layout.commentLevel == 'aus') {
						
						ref = {
							"createRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections, // + '_' + time,
							"readRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections,
							"deleteRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections + '_' + id
						}
					}
					if (layout.commentLevel == 'auds') {
						console.log('curSel: ' + currentSelections);
						ref = {
							"createRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections, // + '_' + time,
							"readRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections,
							"deleteRef": 'CommentsAUS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections + '_' + id
						}
					}
					if (layout.commentLevel == 'as') {
						ref = {
							"createRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections + '_comment',
							"readRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections,
							"deleteRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentSelections + '_comment'
						}
					}
					if (layout.commentLevel == 'ads') {
						ref = {
							"createRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections + '_comment',
							"readRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections,
							"deleteRef": 'CommentsAS_' + appId + '_' + layout.qInfo.qId + '_' + currentDimensionSelections + '_comment'
						}
					}
					if (layout.commentLevel == 'a') {

						ref = {
							"createRef": 'CommentsA_' + appId + '_' + layout.qInfo.qId + '_' + '_comment',
							"readRef": 'CommentsA_' + appId + '_' + layout.qInfo.qId,
							"deleteRef": 'CommentsA_' + appId + '_' + layout.qInfo.qId + '_' + '_comment'
						}
					}
					if (layout.commentLevel == 'au') {
						ref = {
							"createRef": 'CommentsAU_' + appId + '_' + layout.qInfo.qId, // + '_' + time,
							"readRef": 'CommentsAU_' + appId + '_' + layout.qInfo.qId,
							"deleteRef": 'CommentsAU_' + appId + '_' + layout.qInfo.qId + '_' + id
						}
					}
					return ref;
				}

				//needed for export
				return qlik.Promise.resolve();
			}
		};
	});

