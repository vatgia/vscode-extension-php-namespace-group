// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "php-namespace-group" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('php-namespace-group.resolveGroup', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('PHP Auto Namespace Group!');
		// let editor = vscode.window.activeTextEditor;
		// let document = editor?.document;

		// console.log(document);
		resolveNamespaceGroup();

	});

	context.subscriptions.push(disposable);
}


function isCandidate(text: string) {
	return text.startsWith('<?php')
		|| text.startsWith('namespace ')
		|| text.startsWith('use ');
}

function insertNamespace(editor: vscode.TextEditor, namespace: string) {
	editor.edit(textEdit => {
		let insertAt = null;
		let prependText = '\n';

		let start = 0;
		let end = 0;

		for (let line = 0; line < editor.document.lineCount; line++) {
			let text = editor.document.lineAt(line).text;

			if (isCandidate(text)) {
				insertAt = line + 1;

				if (text.startsWith('use ')) {
					start = start ? start : line;
					prependText = '';
					end = line + 1;
				}
			}
		}

		if (insertAt != null) {
			textEdit.replace(new vscode.Position(insertAt, 0), prependText + namespace + '\n');
		}
		var textRange = new vscode.Range(new vscode.Position(start, 0), new vscode.Position(end, 10000));

		textEdit.delete(textRange);

	});
}

function resolveNamespaceGroup() {
	let editor = vscode.window.activeTextEditor;
	let document = editor?.document;
	let selections = editor?.selections;
	let useNamepaces: any[] = [];

	for (let selection of selections) {
		let selectedNamespaces = '';
		if (selection.isEmpty) {
			// vscode.window.showErrorMessage('Please select multi namespace to group.');
			var firstLine = document.lineAt(0);
			var lastLine = document.lineAt(document.lineCount - 1);
			var textRange = new vscode.Range(firstLine.range.start, lastLine.range.end);
			selectedNamespaces = document.getText(textRange);
		} else {
			selectedNamespaces = document.getText(selection);
		}

		let namespaces = selectedNamespaces.split(';');

		namespaces.forEach((line, _index, _array) => {

			/**
			 * Đổi hết về dạng use bình thường đã
			 */

			let lineGroup = line.split('{');
			let prefix = '';
			let namespaceParses = '';
			if (lineGroup.length >= 2) {
				prefix = lineGroup[0];
				namespaceParses = lineGroup[1];
			} else {
				namespaceParses = lineGroup[0];
			}
			namespaceParses = namespaceParses.replace('}', '');
			namespaceParses = namespaceParses.replace('\n', '');
			namespaceParses = namespaceParses.replace('\t', '');
			namespaceParses = namespaceParses.replace('\r', '');
			let namespaceParsesArr = namespaceParses.split(',');

			if (namespaceParsesArr.length >= 2 && prefix == '') {
				let namespaceParsesFirstArr = namespaceParsesArr[0].split(' ');
				namespaceParsesArr[0] = namespaceParsesFirstArr[namespaceParsesFirstArr.length - 1];
				delete namespaceParsesFirstArr[namespaceParsesFirstArr.length - 1];
				prefix = namespaceParsesFirstArr.join(' ');
			}

			prefix = prefix.replace('}', '');
			prefix = prefix.replace('\n', '');
			prefix = prefix.replace('\t', '');
			prefix = prefix.replace('\r', '');

			namespaceParsesArr.forEach(lineUse => {
				lineUse = lineUse.replace('}', '');
				lineUse = lineUse.replace('\n', '');
				lineUse = lineUse.replace('\t', '');
				lineUse = lineUse.replace('\r', '');
				lineUse = lineUse.replace('\r\n', '');

				if (prefix) {
					lineUse = lineUse.replace(' ', '');
					lineUse = lineUse.replace('  ', '');
					lineUse = lineUse.replace('   ', '');
					lineUse = lineUse.replace('    ', '');
					lineUse = lineUse.replace('     ', '');
				}

				useNamepaces.push(prefix + lineUse);
			});


		});

		useNamepaces.forEach((useNamespace, index) => {
			let useNamespaceArr = useNamespace.split(' ');
			useNamespaceArr = useNamespaceArr.filter((val: any) => {

				return val != ' ';
			});
			useNamepaces[index] = useNamespaceArr.join(' ');

			useNamespaceArr = useNamepaces[index].split('\\');
			useNamespaceArr.forEach((val: any, index: any) => {
				useNamespaceArr[index] = val.trim();
			});

			useNamepaces[index] = useNamespaceArr.join('\\');

			useNamepaces[index] = useNamepaces[index].replace('use const', 'use const ');
			useNamepaces[index] = useNamepaces[index].replace('use const  ', 'use const ');
			useNamepaces[index] = useNamepaces[index].replace('use function', 'use function ');
			useNamepaces[index] = useNamepaces[index].replace('use function  ', 'use function ');
			useNamepaces[index] = useNamepaces[index].replace('use', 'use ');
			useNamepaces[index] = useNamepaces[index].replace('use  ', 'use ');

			if (!useNamepaces[index].startsWith('use')) {
				delete (useNamepaces[index]);
			}
		});

		useNamepaces = useNamepaces.filter(val => {

			return val != ' ' && typeof val != undefined;
		});


		//Groups
		let groupClasses: any[] = [];
		let groupConsts: any[] = [];
		let groupFunctions: any[] = [];

		useNamepaces.forEach(namespace => {
			if (namespace.startsWith('use function')) {
				groupFunctions.push(namespace.replace('use function ', ''));
			} else if (namespace.startsWith('use const')) {
				groupConsts.push(namespace.replace('use const ', ''));
			} else {
				groupClasses.push(namespace.replace('use ', ''));
			}
		});

		let groupClassGrouped: any[] = [];
		let groupClassGroupedSingle: any[] = [];
		groupClasses.forEach((namespace, index) => {
			delete (groupClasses[index]);
			let nameSpaceArr = namespace.split('\\');
			if (nameSpaceArr.length <= 1) {
				groupClassGroupedSingle.push(namespace);
			} else {
				groupClassGrouped[nameSpaceArr[0]] = groupClassGrouped[nameSpaceArr[0]] ? groupClassGrouped[nameSpaceArr[0]] : [];
				groupClassGrouped[nameSpaceArr[0]].push(namespace.replace(nameSpaceArr[0] + '\\', ''));

				groupClasses.forEach((namespaceNext, indexNext) => {
					if (namespaceNext.startsWith(nameSpaceArr[0] + '\\')) {
						groupClassGrouped[nameSpaceArr[0]].push(namespaceNext.replace(nameSpaceArr[0] + '\\', ''));
						delete (groupClasses[indexNext]);
					}
				});
			}
		});

		let useNamepacesString = '';
		for (let prefix in groupClassGrouped) {
			let items = groupClassGrouped[prefix];
			if (items.length > 1) {
				useNamepacesString += ('use ' + prefix + '\\{\n' + items.join(',\n') + '\n};\n');
			} else {
				useNamepacesString += 'use ' + prefix + '\\' + items[0] + ';\n';
			}

		}

		if (groupClassGroupedSingle.length > 0) {
			useNamepacesString += 'use ' + groupClassGroupedSingle.join(',\n') + ';\n';
		}

		if (groupFunctions.length > 0) {
			useNamepacesString += 'use function ' + groupFunctions.join(',\n') + ';\n';
		}
		if (groupConsts.length > 0) {
			useNamepacesString += 'use const ' + groupConsts.join(',\n') + ';\n';
		}


		insertNamespace(editor, useNamepacesString);
	}
	// }
}

// This method is called when your extension is deactivated
export function deactivate() { }
