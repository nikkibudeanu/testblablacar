function getReadableVariableNameByCaseStyle({caseStyle, prunedWords, removePrefix}) {
	return function getReadableVariableName(token, tokenGroup, prefix) {
		// Create array with all path segments and token name at the end
		const segments = [...tokenGroup.path];
		if (!tokenGroup.isRoot) {
			segments.push(tokenGroup.name);
		}
		segments.push(token.name);

		if (prefix && prefix.length > 0) {
			segments.unshift(prefix);
		}

		// prune if necessary 
		let cleanSegments = segments;
		if(prunedWords && prunedWords.length > 0) {
			cleanSegments = segments.filter((value) => !prunedWords.includes(value.toLowerCase()))
		}

		// Create "sentence" separated by spaces so we can camelcase it all
		let sentence = cleanSegments.join(' ').toLowerCase();


		// transform string from all segments with the right case pattern
		sentence = sentence.replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => {
			switch (caseStyle) {
				case 'khebab':
					return '-' + chr;
				case 'camel':
					return chr.toUpperCase();
				default:
					return chr;
			}
		});

		// only allow letters, digits, underscore and hyphen
		sentence = sentence.replace(/[^a-zA-Z0-9_-]/g, '_');

		// prepend underscore if it starts with digit
		if (/^\d/.test(sentence)) {
			sentence = '_' + sentence;
		}

		return sentence;
	};
}

/**
 * Helper to get a parsable token name
 */
function getSanitizedName(token, tokenGroup) { 
	return getReadableVariableNameByCaseStyle({ 
		caseStyle: 'camel', 
	})(token, tokenGroup, '');
};

/**
 * Rewrite font-name for SPA fontface declaration
 */
Pulsar.registerFunction('convertFontName', function(fontName) { 
	return fontName === 'GT Eesti Pro Display' ? 'gt-eesti' : fontName
});

/**
 * Parse tokens for light or dark prefixes in the naming, allowing for theme-splitted outputs
 */
 Pulsar.registerFunction('isLightTheme', function(token, tokenGroup) {
	var sanitizedName = getSanitizedName(token, tokenGroup, '');

	return !sanitizedName.startsWith('dark');
});
Pulsar.registerFunction('isDarkTheme', function(token, tokenGroup) {
	var sanitizedName = getSanitizedName(token, tokenGroup, '');

	return !sanitizedName.startsWith('light');
});

/**
 * Parse tokens for reference to given string in name
 */
 Pulsar.registerFunction('includes', function(token, tokenGroup, value) {
	var sanitizedName = getSanitizedName(token, tokenGroup, '');

	return sanitizedName.includes(value);
});

/**
 * Convert group name, token name and possible prefix into khebabCased string, joining everything together
 */
Pulsar.registerFunction('readableVariableKhebabName', getReadableVariableNameByCaseStyle({caseStyle: 'khebab'}));


/**
 * Convert group name, token name and possible prefix into camelCased string, joining everything together
 */
Pulsar.registerFunction('readableVariableCamelName', function( context, tokenGroup, prefix ) {
	let prunedWords = ['light mode', 'light', 'lightmode', 'darkmode', 'dark mode', 'dark', 'sizing', 'spacing', 'borderstyle'];
	if(context.tokenType === 'Measure') {
		prunedWords.push('border radius', 'border width')
	}
	return getReadableVariableNameByCaseStyle({
		caseStyle: 'camel', 
		prunedWords: prunedWords
	})(context, tokenGroup, prefix);
});
Pulsar.registerFunction('readableVariableCamelNameDictionnary', function( ...args ) {
	return getReadableVariableNameByCaseStyle({
		caseStyle: 'camel', 
		prunedWords: ['lightmode', 'light', 'darkmode', 'dark']
	})(...args);
});

function findAliases(token, allTokens) {
	let aliases = allTokens.filter(
		t => t.value.referencedToken && t.value.referencedToken.id === token.id,
	);
	for (const t of aliases) {
		aliases = aliases.concat(findAliases(t, allTokens));
	}
	return aliases;
}

Pulsar.registerFunction('findAliases', findAliases);

Pulsar.registerFunction('gradientAngle', function (from, to) {
	var deltaY = to.y - from.y;
	var deltaX = to.x - from.x;
	var radians = Math.atan2(deltaY, deltaX);
	var result = (radians * 180) / Math.PI;
	result = result + 90;
	return (result < 0 ? 360 + result : result) % 360;
});

/**
 * Behavior configuration of the exporter
 * Prefixes: Add prefix for each category of the tokens. For example, all colors can start with "color, if needed"
 */
Pulsar.registerPayload('behavior', {
	colorTokenPrefix: '',
	borderTokenPrefix: '',
	gradientTokenPrefix: '',
	measureTokenPrefix: '',
	shadowTokenPrefix: '',
	typographyTokenPrefix: '',
	radiusTokenPrefix: '',
	textTokenPrefix: '',
});

Pulsar.registerFunction('cleanRGBA', function (r, g, b, a = 1) {
	var alpha = Math.round((a / 255) * 10) / 10;
	return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
});

Pulsar.registerFunction('rgbaToHsla', function (r, g, b, a = 1) {
	var ratiodR = r / 255;
	var ratiodG = g / 255;
	var ratiodB = b / 255;

	var cmin = Math.min(ratiodR, ratiodG, ratiodB),
		cmax = Math.max(ratiodR, ratiodG, ratiodB),
		delta = cmax - cmin,
		h;

	if (delta === 0) {
		h = 0;
	} else if (cmax === ratiodR) {
		h = ((ratiodG - ratiodB) / delta) % 6;
	} else if (cmax === ratiodG) {
		h = (ratiodB - ratiodR) / delta + 2;
	} else {
		h = (ratiodR - ratiodG) / delta + 4;
	}

	h = Math.round(h * 60);

	var hue = h + (h < 0 ? 360 : 0);

	var light = (cmax + cmin) / 2;
	var lightness = Math.round(((cmax + cmin) / 2) * 100);
	var saturation = Math.round((delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1))) * 100);

	var alpha = Math.round((a / 255) * 10) / 10;

	return 'hsla(' + hue + ', ' + saturation + '%, ' + lightness + '%, ' + alpha + ')';
});

Pulsar.registerFunction('subFamilyToWeight', function (subfamily) {
	const cleanSubFamily = subfamily.toLowerCase;
	switch (cleanSubFamily) {
		case 'thin':
			return 100;
		case 'extralight':
			return 200;
		case 'light':
			return 300;
		case 'normal':
			return 400;
		case 'medium':
			return 500;
		case 'semibold':
			return 600;
		case 'bold':
			return 700;
		case 'extrabold':
			return 800;
		case 'black':
			return 900;
		default:
			return 400;
	}
});

Pulsar.registerFunction('pixelsToRem', function (value) {
	return `${value['measure'] / 10}rem`;
});

Pulsar.registerFunction('logKeys', function (object) {
	console.log(object.font.subfamily);

	for (const entry in object.font) {
		console.log(entry);
	}
});

Pulsar.registerFunction('filterByGroupName', function (tokens, tokensGroups, groupName) {	
	const allowedGroup = tokensGroups.filter(group => group.name === groupName);
	
	if(!allowedGroup || allowedGroup.length === 0) {
		return;
	}

	const allowedIds = allowedGroup[0].tokenIds;

	return tokens.filter(token => allowedIds.includes(token.id));
});


Pulsar.registerFunction('getTargetGroupId', function (tokensGroups, groupName) {	
	const allowedGroup = tokensGroups.filter(group => group.name === groupName);
	
	if(!allowedGroup || allowedGroup.length === 0) {
		return;
	}


	return allowedGroup[0].id
});

Pulsar.registerFunction('parseTokenType', function (token) {
	if (token.tokenType === 'Text') {
		const typeFromName = token.name.split('/')[0];

		return typeFromName;
	}

	return `${token.tokenType.toLowerCase()}`;
});

Pulsar.registerFunction('baseWrap', function (token, designSystemName) {
	const stringPrefix = token.split(':')[0];
	const safeName = designSystemName.toLowerCase();
	if (stringPrefix === 'data') {
		return `url('${token}')`;
	}

	if (token.includes('keyframes')) {
		return token.replace('coral', `coral-${safeName}`);
	}

	return token;
});

Pulsar.registerFunction('getFigmaKey', function (token) {
	return token.origin ? token.origin.id : token.id;
});

Pulsar.registerFunction('getThemeName', function (name) {
	const safeName = name.toLowerCase();

	return safeName;
});

Pulsar.registerFunction('getSelector', function (name) {
	const safeName = name.toLowerCase();

	return '[data-theme="' + safeName + '"]';
});

// CSS
/**
 * Convert group name, token name and possible prefix into camelCased string, joining everything together
 */
Pulsar.registerFunction('readableVariableName', function (token, tokenGroup, prefix) {
	// Create array with all path segments and token name at the end
	const segments = [...tokenGroup.path];
	if (!tokenGroup.isRoot) {
		segments.push(tokenGroup.name);
	}
	segments.push(token.name);

	if (prefix && prefix.length > 0) {
		segments.unshift(prefix);
	}

	// Create "sentence" separated by spaces so we can camelcase it all
	let sentence = segments.join(' ');

	// camelcase string from all segments
	sentence = sentence.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => '-' + chr);

	// only allow letters, digits, underscore and hyphen
	sentence = sentence.replace(/[^a-zA-Z0-9_-]/g, '_');

	// prepend underscore if it starts with digit
	if (/^\d/.test(sentence)) {
		sentence = '_' + sentence;
	}

	return sentence;
});

Pulsar.registerFunction('getScheme', function (name) {
	const safeName = name.toLowerCase();

	if (safeName === 'dark') {
		return 'color-scheme: dark;';
	}

	return 'color-scheme: light;';
});

Pulsar.registerFunction('constructGenericTokensStyles', function (token, dsName) {
	const name = token.name;
	const safeThemeName = dsName.toLowerCase();

	if (token.name.includes('keyframes')) {
		return `@keyframes ${name.replace('coral', `coral-${safeThemeName}`)} `;
	}

	return token.name;
});

Pulsar.registerFunction('prefixWithThemeName', function (value, dsName) {
	const safeThemeName = dsName.toLowerCase();
	return value.replace('coral', `coral-${safeThemeName}`);
});

// TS
Pulsar.registerFunction('addQuotes', function (text) {
	return `'${text}'`;
});

Pulsar.registerFunction('isInGroup', function (values, tokenGroup, groupName) {
	const segments = [...tokenGroup.path];
	if (!tokenGroup.isRoot) {
		segments.push(tokenGroup.name);
	}

	return segments.some((value) => groupName.indexOf(value) >= 0)
});