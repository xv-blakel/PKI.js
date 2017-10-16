import * as asn1js from "asn1js";
import { getParametersValue, bufferToHexCodes } from "pvutils";
import {
	getOIDByAlgorithm,
	getAlgorithmParameters,
	getCrypto,
	getAlgorithmByOID,
	createECDSASignatureFromCMS,
	createCMSECDSASignature,
	getHashAlgorithm
} from "./common";
import AlgorithmIdentifier from "./AlgorithmIdentifier";
import RelativeDistinguishedNames from "./RelativeDistinguishedNames";
import Time from "./Time";
import RevokedCertificate from "./RevokedCertificate";
import Extensions from "./Extensions";
import RSASSAPSSParams from "./RSASSAPSSParams";
import PublicKeyInfo from "./PublicKeyInfo";
//**************************************************************************************
function tbsCertList(parameters = {})
{
	//TBSCertList  ::=  SEQUENCE  {
	//    version                 Version OPTIONAL,
	//                                 -- if present, MUST be v2
	//    signature               AlgorithmIdentifier,
	//    issuer                  Name,
	//    thisUpdate              Time,
	//    nextUpdate              Time OPTIONAL,
	//    revokedCertificates     SEQUENCE OF SEQUENCE  {
	//        userCertificate         CertificateSerialNumber,
	//        revocationDate          Time,
	//        crlEntryExtensions      Extensions OPTIONAL
	//        -- if present, version MUST be v2
	//    }  OPTIONAL,
	//    crlExtensions           [0]  EXPLICIT Extensions OPTIONAL
	//    -- if present, version MUST be v2
	//}
	
	/**
	 * @type {Object}
	 * @property {string} [blockName]
	 * @property {string} [tbsCertListVersion]
	 * @property {string} [signature]
	 * @property {string} [issuer]
	 * @property {string} [tbsCertListThisUpdate]
	 * @property {string} [tbsCertListNextUpdate]
	 * @property {string} [tbsCertListRevokedCertificates]
	 * @property {string} [crlExtensions]
	 */
	const names = getParametersValue(parameters, "names", {});
	
	return (new asn1js.Sequence({
		name: (names.blockName || "tbsCertList"),
		value: [
			new asn1js.Integer({
				optional: true,
				name: (names.tbsCertListVersion || "tbsCertList.version"),
				value: 2
			}), // EXPLICIT integer value (v2)
			AlgorithmIdentifier.schema(names.signature || {
				names: {
					blockName: "tbsCertList.signature"
				}
			}),
			RelativeDistinguishedNames.schema(names.issuer || {
				names: {
					blockName: "tbsCertList.issuer"
				}
			}),
			Time.schema(names.tbsCertListThisUpdate || {
				names: {
					utcTimeName: "tbsCertList.thisUpdate",
					generalTimeName: "tbsCertList.thisUpdate"
				}
			}),
			Time.schema(names.tbsCertListNextUpdate || {
				names: {
					utcTimeName: "tbsCertList.nextUpdate",
					generalTimeName: "tbsCertList.nextUpdate"
				}
			}, true),
			new asn1js.Sequence({
				optional: true,
				value: [
					new asn1js.Repeated({
						name: (names.tbsCertListRevokedCertificates || "tbsCertList.revokedCertificates"),
						value: new asn1js.Sequence({
							value: [
								new asn1js.Integer(),
								Time.schema(),
								Extensions.schema({}, true)
							]
						})
					})
				]
			}),
			new asn1js.Constructed({
				optional: true,
				idBlock: {
					tagClass: 3, // CONTEXT-SPECIFIC
					tagNumber: 0 // [0]
				},
				value: [Extensions.schema(names.crlExtensions || {
					names: {
						blockName: "tbsCertList.extensions"
					}
				})]
			}) // EXPLICIT SEQUENCE value
		]
	}));
}
//**************************************************************************************
/**
 * Class from RFC5280
 */
export default class CertificateRevocationList {
	//**********************************************************************************
	/**
	 * Constructor for Attribute class
	 * @param {Object} [parameters={}]
	 * @property {Object} [schema] asn1js parsed value
	 */
	constructor(parameters = {})
	{
		//region Internal properties of the object
		/**
		 * @type {ArrayBuffer}
		 * @description tbs
		 */
		this.tbs = getParametersValue(parameters, "tbs", CertificateRevocationList.defaultValues("tbs"));
		/**
		 * @type {number}
		 * @description version
		 */
		this.version = getParametersValue(parameters, "version", CertificateRevocationList.defaultValues("version"));
		/**
		 * @type {AlgorithmIdentifier}
		 * @description signature
		 */
		this.signature = getParametersValue(parameters, "signature", CertificateRevocationList.defaultValues("signature"));
		/**
		 * @type {RelativeDistinguishedNames}
		 * @description issuer
		 */
		this.issuer = getParametersValue(parameters, "issuer", CertificateRevocationList.defaultValues("issuer"));
		/**
		 * @type {Time}
		 * @description thisUpdate
		 */
		this.thisUpdate = getParametersValue(parameters, "thisUpdate", CertificateRevocationList.defaultValues("thisUpdate"));
		
		if("nextUpdate" in parameters)
			/**
			 * @type {Time}
			 * @description nextUpdate
			 */
			this.nextUpdate = getParametersValue(parameters, "nextUpdate", CertificateRevocationList.defaultValues("nextUpdate"));
		
		if("revokedCertificates" in parameters)
			/**
			 * @type {Array.<RevokedCertificate>}
			 * @description revokedCertificates
			 */
			this.revokedCertificates = getParametersValue(parameters, "revokedCertificates", CertificateRevocationList.defaultValues("revokedCertificates"));
		
		if("crlExtensions" in parameters)
			/**
			 * @type {Extensions}
			 * @description crlExtensions
			 */
			this.crlExtensions = getParametersValue(parameters, "crlExtensions", CertificateRevocationList.defaultValues("crlExtensions"));
		
		/**
		 * @type {AlgorithmIdentifier}
		 * @description signatureAlgorithm
		 */
		this.signatureAlgorithm = getParametersValue(parameters, "signatureAlgorithm", CertificateRevocationList.defaultValues("signatureAlgorithm"));
		/**
		 * @type {BitString}
		 * @description signatureValue
		 */
		this.signatureValue = getParametersValue(parameters, "signatureValue", CertificateRevocationList.defaultValues("signatureValue"));
		//endregion
		
		//region If input argument array contains "schema" for this object
		if("schema" in parameters)
			this.fromSchema(parameters.schema);
		//endregion
	}
	//**********************************************************************************
	/**
	 * Return default values for all class members
	 * @param {string} memberName String name for a class member
	 */
	static defaultValues(memberName)
	{
		switch(memberName)
		{
			case "tbs":
				return new ArrayBuffer(0);
			case "version":
				return 1;
			case "signature":
				return new AlgorithmIdentifier();
			case "issuer":
				return new RelativeDistinguishedNames();
			case "thisUpdate":
				return new Time();
			case "nextUpdate":
				return new Time();
			case "revokedCertificates":
				return [];
			case "crlExtensions":
				return new Extensions();
			case "signatureAlgorithm":
				return new AlgorithmIdentifier();
			case "signatureValue":
				return new asn1js.BitString();
			default:
				throw new Error(`Invalid member name for CertificateRevocationList class: ${memberName}`);
		}
	}
	//**********************************************************************************
	/**
	 * Return value of asn1js schema for current class
	 * @param {Object} parameters Input parameters for the schema
	 * @returns {Object} asn1js schema object
	 */
	static schema(parameters = {})
	{
		//CertificateList  ::=  SEQUENCE  {
		//    tbsCertList          TBSCertList,
		//    signatureAlgorithm   AlgorithmIdentifier,
		//    signatureValue       BIT STRING  }
		
		/**
		 * @type {Object}
		 * @property {string} [blockName]
		 * @property {string} [signatureAlgorithm]
		 * @property {string} [signatureValue]
		 */
		const names = getParametersValue(parameters, "names", {});
		
		return (new asn1js.Sequence({
			name: (names.blockName || "CertificateList"),
			value: [
				tbsCertList(parameters),
				AlgorithmIdentifier.schema(names.signatureAlgorithm || {
					names: {
						blockName: "signatureAlgorithm"
					}
				}),
				new asn1js.BitString({ name: (names.signatureValue || "signatureValue") })
			]
		}));
	}
	//**********************************************************************************
	/**
	 * Convert parsed asn1js object into current class
	 * @param {!Object} schema
	 */
	fromSchema(schema)
	{
		//region Check the schema is valid
		const asn1 = asn1js.compareSchema(schema,
			schema,
			CertificateRevocationList.schema()
		);
		
		if(asn1.verified === false)
			throw new Error("Object's schema was not verified against input data for CRL");
		//endregion
		
		//region Get internal properties from parsed schema
		this.tbs = asn1.result.tbsCertList.valueBeforeDecode;
		
		if("tbsCertList.version" in asn1.result)
			this.version = asn1.result["tbsCertList.version"].valueBlock.valueDec;
		this.signature = new AlgorithmIdentifier({ schema: asn1.result["tbsCertList.signature"] });
		this.issuer = new RelativeDistinguishedNames({ schema: asn1.result["tbsCertList.issuer"] });
		this.thisUpdate = new Time({ schema: asn1.result["tbsCertList.thisUpdate"] });
		if("tbsCertList.nextUpdate" in asn1.result)
			this.nextUpdate = new Time({ schema: asn1.result["tbsCertList.nextUpdate"] });
		if("tbsCertList.revokedCertificates" in asn1.result)
			this.revokedCertificates = Array.from(asn1.result["tbsCertList.revokedCertificates"], element => new RevokedCertificate({ schema: element }));
		if("tbsCertList.extensions" in asn1.result)
			this.crlExtensions = new Extensions({ schema: asn1.result["tbsCertList.extensions"] });
		
		this.signatureAlgorithm = new AlgorithmIdentifier({ schema: asn1.result.signatureAlgorithm });
		this.signatureValue = asn1.result.signatureValue;
		//endregion
	}
	//**********************************************************************************
	encodeTBS()
	{
		//region Create array for output sequence
		const outputArray = [];
		
		if(this.version !== CertificateRevocationList.defaultValues("version"))
			outputArray.push(new asn1js.Integer({ value: this.version }));
		
		outputArray.push(this.signature.toSchema());
		outputArray.push(this.issuer.toSchema());
		outputArray.push(this.thisUpdate.toSchema());
		
		if("nextUpdate" in this)
			outputArray.push(this.nextUpdate.toSchema());
		
		if("revokedCertificates" in this)
		{
			outputArray.push(new asn1js.Sequence({
				value: Array.from(this.revokedCertificates, element => element.toSchema())
			}));
		}
		
		if("crlExtensions" in this)
		{
			outputArray.push(new asn1js.Constructed({
				optional: true,
				idBlock: {
					tagClass: 3, // CONTEXT-SPECIFIC
					tagNumber: 0 // [0]
				},
				value: [
					this.crlExtensions.toSchema()
				]
			}));
		}
		//endregion
		
		return (new asn1js.Sequence({
			value: outputArray
		}));
	}
	//**********************************************************************************
	/**
	 * Convert current object to asn1js object and set correct values
	 * @returns {Object} asn1js object
	 */
	toSchema(encodeFlag = false)
	{
		//region Decode stored TBS value
		let tbsSchema;
		
		if(encodeFlag === false)
		{
			if(this.tbs.length === 0) // No stored TBS part
				return CertificateRevocationList.schema();
			
			tbsSchema = asn1js.fromBER(this.tbs).result;
		}
		//endregion
		//region Create TBS schema via assembling from TBS parts
		else
			tbsSchema = this.encodeTBS();
		//endregion
		
		//region Construct and return new ASN.1 schema for this object
		return (new asn1js.Sequence({
			value: [
				tbsSchema,
				this.signatureAlgorithm.toSchema(),
				this.signatureValue
			]
		}));
		//endregion
	}
	//**********************************************************************************
	/**
	 * Convertion for the class to JSON object
	 * @returns {Object}
	 */
	toJSON()
	{
		const object = {
			tbs: bufferToHexCodes(this.tbs, 0, this.tbs.byteLength),
			signature: this.signature.toJSON(),
			issuer: this.issuer.toJSON(),
			thisUpdate: this.thisUpdate.toJSON(),
			signatureAlgorithm: this.signatureAlgorithm.toJSON(),
			signatureValue: this.signatureValue.toJSON()
		};
		
		if(this.version !== CertificateRevocationList.defaultValues("version"))
			object.version = this.version;
		
		if("nextUpdate" in this)
			object.nextUpdate = this.nextUpdate.toJSON();
		
		if("revokedCertificates" in this)
			object.revokedCertificates = Array.from(this.revokedCertificates, element => element.toJSON());
		
		if("crlExtensions" in this)
			object.crlExtensions = this.crlExtensions.toJSON();
		
		return object;
	}
	//**********************************************************************************
	isCertificateRevoked(certificate)
	{
		//region Check that issuer of the input certificate is the same with issuer of this CRL
		if(this.issuer.isEqual(certificate.issuer) === false)
			return false;
		//endregion
		
		//region Check that there are revoked certificates in this CRL
		if(("revokedCertificates" in this) === false)
			return false;
		//endregion
		
		//region Search for input certificate in revoked certificates array
		for(const revokedCertificate of this.revokedCertificates)
		{
			if(revokedCertificate.userCertificate.isEqual(certificate.serialNumber))
				return true;
		}
		//endregion
		
		return false;
	}
	//**********************************************************************************
	/**
	 * Make a signature for existing CRL data
	 * @param {Object} privateKey Private key for "subjectPublicKeyInfo" structure
	 * @param {string} [hashAlgorithm] Hashing algorithm. Default SHA-1
	 */
	sign(privateKey, hashAlgorithm = "SHA-1")
	{
		//region Initial checking
		//region Get a private key from function parameter
		if(typeof privateKey === "undefined")
			return Promise.reject("Need to provide a private key for signing");
		//endregion
		//endregion
		
		//region Initial variables
		let sequence = Promise.resolve();
		let parameters;
		
		const engine = getEngine();
		//endregion
		
		//region Get a "default parameters" for current algorithm and set correct signature algorithm
		sequence = sequence.then(() => engine.subtle.getSignatureParameters(privateKey, hashAlgorithm));
		
		sequence = sequence.then(result =>
		{
			parameters = result.parameters;
			this.signature = result.signatureAlgorithm;
			this.signatureAlgorithm = result.signatureAlgorithm;
		});
		//endregion
		
		//region Create TBS data for signing
		sequence = sequence.then(() =>
		{
			this.tbs = this.encodeTBS().toBER(false);
		});
		//endregion
		
		//region Signing TBS data on provided private key
		sequence = sequence.then(() => engine.subtle.signWithPrivateKey(this.tbs, privateKey, parameters));
		
		sequence = sequence.then(result =>
		{
			this.signatureValue = new asn1js.BitString({ valueHex: result });
		});
		//endregion
		
		return sequence;
	}
	//**********************************************************************************
	/**
	 * Verify existing signature
	 * @param {{[issuerCertificate]: Object, [publicKeyInfo]: Object}} parameters
	 * @returns {*}
	 */
	verify(parameters = {})
	{
		//region Global variables
		let sequence = Promise.resolve();
		
		const signature = this.signatureValue;
		const tbs = this.tbs;
		
		let subjectPublicKeyInfo = -1;
		//endregion
		
		//region Get information about CRL issuer certificate
		if("issuerCertificate" in parameters) // "issuerCertificate" must be of type "simpl.CERT"
		{
			subjectPublicKeyInfo = parameters.issuerCertificate.subjectPublicKeyInfo;
			
			// The CRL issuer name and "issuerCertificate" subject name are not equal
			if(this.issuer.isEqual(parameters.issuerCertificate.subject) === false)
				return Promise.resolve(false);
		}
		
		//region In case if there is only public key during verification
		if("publicKeyInfo" in parameters)
			subjectPublicKeyInfo = parameters.publicKeyInfo; // Must be of type "PublicKeyInfo"
		//endregion
		
		if((subjectPublicKeyInfo instanceof PublicKeyInfo) === false)
			return Promise.reject("Issuer's certificate must be provided as an input parameter");
		//endregion
		
		//region Check the CRL for unknown critical extensions
		if("crlExtensions" in this)
		{
			for(const extension of this.crlExtensions.extensions)
			{
				if(extension.critical)
				{
					// We can not be sure that unknown extension has no value for CRL signature
					if(("parsedValue" in extension) === false)
						return Promise.resolve(false);
				}
			}
		}
		//endregion
		
		//region Get a "crypto" extension
		const crypto = getCrypto();
		if(typeof crypto === "undefined")
			return Promise.reject("Unable to create WebCrypto object");
		//endregion
		
		//region Find signer's hashing algorithm
		const shaAlgorithm = getHashAlgorithm(this.signatureAlgorithm);
		if(shaAlgorithm === "")
			return Promise.reject(`Unsupported signature algorithm: ${this.signatureAlgorithm.algorithmId}`);
		//endregion
		
		//region Import public key
		sequence = sequence.then(() =>
		{
			//region Get information about public key algorithm and default parameters for import
			const algorithmObject = getAlgorithmByOID(this.signature.algorithmId);
			if(("name" in algorithmObject) === "")
				return Promise.reject(`Unsupported public key algorithm: ${this.signature.algorithmId}`);
			
			const algorithm = getAlgorithmParameters(algorithmObject.name, "importkey");
			if("hash" in algorithm.algorithm)
				algorithm.algorithm.hash.name = shaAlgorithm;
			
			//region Special case for ECDSA
			if(algorithmObject.name === "ECDSA")
			{
				// #region Get information about named curve
				let algorithmParamsChecked = false;
				
				if(("algorithmParams" in subjectPublicKeyInfo.algorithm) === true)
				{
					if("idBlock" in subjectPublicKeyInfo.algorithm.algorithmParams)
					{
						if((subjectPublicKeyInfo.algorithm.algorithmParams.idBlock.tagClass === 1) && (subjectPublicKeyInfo.algorithm.algorithmParams.idBlock.tagNumber === 6))
							algorithmParamsChecked = true;
					}
				}
				
				if(algorithmParamsChecked === false)
					return Promise.reject("Incorrect type for ECDSA public key parameters");
				
				const curveObject = getAlgorithmByOID(subjectPublicKeyInfo.algorithm.algorithmParams.valueBlock.toString());
				if(("name" in curveObject) === false)
					return Promise.reject(`Unsupported named curve algorithm: ${subjectPublicKeyInfo.algorithm.algorithmParams.valueBlock.toString()}`);
				// #endregion
				
				algorithm.algorithm.namedCurve = curveObject.name;
			}
			//endregion
			//endregion
			
			const publicKeyInfoSchema = subjectPublicKeyInfo.toSchema();
			const publicKeyInfoBuffer = publicKeyInfoSchema.toBER(false);
			const publicKeyInfoView = new Uint8Array(publicKeyInfoBuffer);
			
			return crypto.importKey("spki",
				publicKeyInfoView,
				algorithm.algorithm,
				true,
				algorithm.usages
			);
		});
		//endregion
		
		//region Verify signature for the certificate
		sequence = sequence.then(publicKey =>
		{
			//region Get default algorithm parameters for verification
			const algorithm = getAlgorithmParameters(publicKey.algorithm.name, "verify");
			if("hash" in algorithm.algorithm)
				algorithm.algorithm.hash.name = shaAlgorithm;
			//endregion
			
			//region Special case for ECDSA signatures
			let signatureValue = signature.valueBlock.valueHex;
			
			if(publicKey.algorithm.name === "ECDSA")
			{
				const asn1 = asn1js.fromBER(signatureValue);
				signatureValue = createECDSASignatureFromCMS(asn1.result);
			}
			//endregion
			
			//region Special case for RSA-PSS
			if(publicKey.algorithm.name === "RSA-PSS")
			{
				let pssParameters;
				
				try
				{
					pssParameters = new RSASSAPSSParams({ schema: this.signatureAlgorithm.algorithmParams });
				}
				catch(ex)
				{
					return Promise.reject(ex);
				}
				
				if("saltLength" in pssParameters)
					algorithm.algorithm.saltLength = pssParameters.saltLength;
				else
					algorithm.algorithm.saltLength = 20;
				
				let hashAlgo = "SHA-1";
				
				if("hashAlgorithm" in pssParameters)
				{
					const hashAlgorithm = getAlgorithmByOID(pssParameters.hashAlgorithm.algorithmId);
					if(("name" in hashAlgorithm) === false)
						return Promise.reject(`Unrecognized hash algorithm: ${pssParameters.hashAlgorithm.algorithmId}`);
					
					hashAlgo = hashAlgorithm.name;
				}
				
				algorithm.algorithm.hash.name = hashAlgo;
			}
			//endregion
			
			return crypto.verify(algorithm.algorithm,
				publicKey,
				new Uint8Array(signatureValue),
				new Uint8Array(tbs)
			);
		});
		//endregion
		
		return sequence;
	}
	//**********************************************************************************
}
//**************************************************************************************
