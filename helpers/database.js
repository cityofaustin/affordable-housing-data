//use env variables
require('dotenv').config();

const fs = require('fs');
const mysql = require('mysql');
const bcrypt = require('bcryptjs')

const fieldsMap = require('./propertyFieldsMap.js').fieldsMap;
const thisFilename = 'database.js';
const _ = require('underscore');
const moment = require('moment');

async function updateData(updateDataObj, propertyId, user_id) {
	// TODO: if there is no propertyId, throw error

	// iterate through updateDataObj
	// key is the field name, value is an object that might look like this {value: x, verify: y}
	// given the property id, the field name, and the value, we want to update the information
	for (var field in updateDataObj) {
		if (_.has(fieldsMap, field) && fieldsMap[field].active) {

			var value = updateDataObj[field].value;
			var verify = updateDataObj[field].verify;

			console.log(verify);

			// update PropertyVerifications
			if (!(verify == undefined)) {
				var verifyExists = await query(
					process.env.DB_NAME, 
					`SELECT id from PropertyVerifications WHERE field = '${field}' AND property_id = ${propertyId}`
				);

				if (verifyExists.length > 0) {
					var verifyId = verifyExists[0].id;
					await query(
						process.env.DB_NAME, 
						`UPDATE PropertyVerifications SET verified = ${verify}, last_updated = '${moment().format('YYYY-MM-DD HH:mm:ss')}', updated_by_user_id=${mysql.escape(user_id)} WHERE id = ${verifyId}`
					);
				} else {
					await query(
						process.env.DB_NAME, 
						`INSERT INTO PropertyVerifications (verified, property_id, field, last_updated, updated_by_user_id) VALUES (${mysql.escape(verify)}, ${mysql.escape(propertyId)}, ${mysql.escape(field)}, '${moment().format('YYYY-MM-DD HH:mm:ss')}', ${mysql.escape(user_id)})`
					);
				}

			}

			// value could be null, but not undefined - for example if they selected unknown through the UI
			if (!_.isUndefined(value)) {
				// check that field is in fieldsMap, and that it is active
				// run sql command to update that one field
				await query(
					process.env.DB_NAME,
					`UPDATE Properties SET ${field} = ${mysql.escape(value)} WHERE id =${mysql.escape(propertyId)}`
				);
			}
		} else if (field==='Note'){
			if (!(value ==='')) {
				var note_text = updateDataObj[field].value;
				//console.log(note_text);
				await query(
					process.env.DB_NAME, 
					`INSERT into notes (property_id,note_text,created_on,created_by)
					VALUES (${mysql.escape(propertyId)}, ${mysql.escape(note_text)}, '${moment().format('YYYY-MM-DD HH:mm:ss')}', ${mysql.escape(user_id)})`
				)
			}
		}
	}
}

async function deleteData(propertyId, user_id) {
	await query(
		process.env.DB_NAME,
		`UPDATE Properties SET is_duplicate = 1 WHERE id =${mysql.escape(propertyId)} `
	);
	await query(
		process.env.DB_NAME,
		`UPDATE propertyverifications SET deleted_flag = 1, updated_by_user_id=${mysql.escape(user_id)} WHERE property_id =${mysql.escape(propertyId)} `
	);
}

async function updateSessionId(userId, sessionId) {
	return new Promise(async (resolve, reject) => {
		var error = null;

		try {
			var conn = await getDatabaseConnection();
			var sql = `UPDATE Users SET session_id =${mysql.escape(sessionId)} WHERE id=${mysql.escape(userId)}`;
			await queryDatabase(conn, process.env.DB_NAME, sql); 
			console.log('session id UPDATE')
		} catch(e) {
			error = new Error(thisFilename + ' => updateSessionID(), caught exception:\n' + e.stack);
		} finally {
			await closeDatabaseConnection(conn);
			if (error) {
				return reject(error);
			} else {
				return resolve(true);
			}
		}
	});
}


async function deleteSessionId(userId, sessionId) {
	return new Promise(async (resolve, reject) => {
		var error = null;
		try {
			var conn = await getDatabaseConnection();
			var sql = `UPDATE Users SET session_id =NULL WHERE id=${mysql.escape(userId)} and session_id =${mysql.escape(sessionId)}`;
			await queryDatabase(conn, process.env.DB_NAME, sql);
			console.log('delete sessionID')
		} catch(e) {
			error = new Error(thisFilename + ' => deleteSessionID(), caught exception:\n' + e.stack);
		} finally {
			await closeDatabaseConnection(conn);
			if (error) {
				return reject(error);
			} else {
				return resolve(true);
			}
		}
	});
}


async function doesUserExist(email, pass) {
	return new Promise(async (resolve, reject) => {
		var error = null;

		try {
			var conn = await getDatabaseConnection();
			var res = await queryDatabase(
				conn,
				process.env.DB_NAME, 
				`SELECT * FROM Users WHERE email=${mysql.escape(email)}`
			);
			if (res.length > 1) {
				return reject(new Error(thisFilename + ' => doesUserExist(), multiple users found but one expected'));
			}
			if (res.length == 0) {
				return resolve(false)
			}
			if (bcrypt.compareSync(pass, res[0].passwd)) {
				return resolve(res);
				
			} else {
				return resolve(false);
			}
		} catch(e) {
			error = new Error(thisFilename + ' => doesUserExist(), caught exception:\n' + e.stack);
		} finally {
			closeDatabaseConnection(conn);
			if (error) {
				return reject(error);
			} else {
				return resolve(res);
			}
		}
	});
}

async function getUser(email) {
	try {
		var conn = await getDatabaseConnection();
		var res = await queryDatabase(
			conn,
			process.env.DB_NAME, 
			`SELECT * FROM Users WHERE email = ${mysql.escape(email)}`
		);
		await closeDatabaseConnection(conn);

		if (res.length > 1) {
			throw new Error('getUser() found multiple users');
		}
	} catch (e) {
		throw new Error(thisFilename + ' => getUser(), caught exception:\n' + e.stack);
	}
	return res;
}

async function createUser(firstName, lastName, org, email, passwd) {
	return new Promise(async (resolve, reject) => {
		try {
			var conn = await getDatabaseConnection();
			var passwdHash = bcrypt.hashSync(passwd, 11);
			var results = await queryDatabase(
				conn,
				process.env.DB_NAME, 
				`INSERT INTO Users (first_name, last_name, org, email, passwd) VALUES (${mysql.escape(firstName)}, ${mysql.escape(lastName)}, ${mysql.escape(org)}, ${mysql.escape(email)}, ${mysql.escape(passwdHash)})`
			);
			await closeDatabaseConnection(conn);
		} catch(e) {
			await closeDatabaseConnection(conn);
			return reject(new Error(thisFilename + ' => createUser(), caught exception:\n' + e.stack)); // TODO: double check error handling in this case
		}

		return resolve(results)
	});
}

async function getUpdatePropertiesList() {
	// TODO: error handling

	var res = query(
		process.env.DB_NAME, 
		'SELECT p.id, p.property_name, funding_source_haca, funding_source_hatc, funding_source_tdhca, funding_source_nhcd, data_source_ahi, data_source_tdhca, data_source_atc_guide,  address, phone, p.email as email, website, city, total_income_restricted_units, total_section_8_units, zipcode, u.email as assigned_user_email FROM Properties p LEFT JOIN Users u ON p.assigned_user_id = u.id WHERE is_duplicate != 1 AND NOT (outside_etj <=> 1)'
	);

	return res;
}

async function getAllProperties() {
	var includeFields = [
		'id',
		'property_name',
		'address',
		'city',
		'state',
		'zipcode',
		'lat',
		'longitude',
		'unit_type',
		'council_district',
		'phone',
		'email',
		'website',
		'students_only',
		'community_elderly',
		'community_disabled',
		'community_domestic_abuse_survivor',
		'community_mental',
		'community_military',
		'community_served_descriptions',
		'broken_lease',
		'broken_lease_criteria',
		'eviction_history',
		'eviction_history_criteria',
		'criminal_history',
		'criminal_history_criteria',
		'has_waitlist',
		'total_units',
		'total_psh_units',
		'total_income_restricted_units',
		'total_accessible_ir_units',
		'accepts_section_8',
		'total_public_housing_units',
		'num_units_mfi_30',
		'num_units_mfi_40',
		'num_units_mfi_50',
		'num_units_mfi_60',
		'num_units_mfi_65',
		'num_units_mfi_70',
		'num_units_mfi_80',
		'num_units_mfi_90',
		'num_units_mfi_100',
		'num_units_mfi_110',
		'num_units_mfi_120',
		'has_playground',
		'has_pool',
		'has_off_street_parking',
		'has_air_conditioning',
		'has_ceiling_fans',
		'wd_unit',
		'wd_hookups',
		'wd_onsite',
		'wd_other',
		'allows_pet',
		'pet_other',
		'security',
		'elementary_school',
		'middle_school',
		'high_school',
		'affordability_expiration',
		'has_available_affordable_units'
	];
	var fieldsString = includeFields.join(', ');
	var res = await query(
		process.env.DB_NAME, 
		`SELECT ${fieldsString} FROM Properties WHERE is_duplicate != 1 AND NOT (outside_etj <=> 1)`
	);
	return res;
}

async function getAllPropertiesAllFields() {
	var res = await query(
		process.env.DB_NAME, 
		'SELECT * FROM Properties where is_duplicate != 1 AND NOT (outside_etj <=> 1)'
	);
	return res;
}

// create conn, do query, close connection
async function query(db, query) {
		// TODO: error handling
		var conn = await getDatabaseConnection();
		var res = await queryDatabase(
			conn,
			db,
			query
		);
		await closeDatabaseConnection(conn);
	return res;
}

async function getProperty(id) {
	// TODO: properly handle errors
	var res = await query(
		process.env.DB_NAME, 
		`SELECT * from Properties WHERE id = ${id}`
	);
	return res;
}

async function getPropertyNotes(id) {
	function reformat(result) {
		var obj = {};
		if (res.length > 0) {
			let ct = 1;
			for (var r of res) {
				obj[ct] = {note_id: r.note_id, created_on: r.created_on, created_by: r.email, note_text:r.note_text}
				ct ++;
			}
			return obj;
		} else {
			return null; // TODO: change this to return empty object like in getAllPropertyVerifications
		}
	}

	// TODO: error handling
	var res = await query(
		process.env.DB_NAME, 
		`SELECT  * from notes LEFT JOIN Users ON created_by = Users.id 
		WHERE property_id = ${id} and delete_flag=0
		order by note_id desc`
	);
	//console.log('Notes'+ res);
	return reformat(res);
}


async function getPropertyVerifications(id) {
	function reformat(result) {
		var obj = {};
		if (res.length > 0) {
			for (var r of res) {
				obj[r.field] = {verified: r.verified, lastUpdated: r.last_updated, updateUserEmail: r.email}
			}
			return obj;
		} else {
			return null; // TODO: change this to return empty object like in getAllPropertyVerifications
		}
	}

	// TODO: error handling
	var res = await query(
		process.env.DB_NAME, 
		`SELECT  * from PropertyVerifications LEFT JOIN Users ON updated_by_user_id = Users.id WHERE property_id = ${id} `
	);
	return reformat(res);
}

async function getAllPropertyVerifications() {
	function reformat(result) {
		var obj = {};
		if (res.length > 0) {
			for (var r of res) {
				if (!_.has(obj, r.property_id)) {
					obj[r.property_id] = {}
				}
				obj[r.property_id][r.field] = r.verified;
			}
			return obj;
		} else {
			return {};
		}
	}
	var res = await query(
		process.env.DB_NAME, 
		`SELECT * from PropertyVerifications`
	);
	return reformat(res);
}

async function getPropertyAssignedUser(id) {
	var res = await query(
		process.env.DB_NAME, 
		`SELECT assigned_user_id, Users.email from Properties INNER JOIN Users ON Properties.assigned_user_id = Users.id WHERE Properties.id = ${id}`
	);
	return res;
}

async function unassignUser(id) {
	// TODO: need to error handle properly
	if (id) {
		var res = await query(
			process.env.DB_NAME, 
			`UPDATE Properties SET assigned_user_id = NULL WHERE id = ${id}`
		);
		return true
	}
	return false;
}

async function createProperty(name, address, city, state, zip) {
	var result = await query(
		process.env.DB_NAME, 
		`INSERT INTO Properties (property_name, address, city, state, zipcode) VALUES (${mysql.escape(name)}, ${mysql.escape(address)}, ${mysql.escape(city)}, ${mysql.escape(state)}, ${mysql.escape(zip)}) `
	);
	return result;
}

async function assign_property_to_user(propertyId, userId) {
	// TODO: need to error handle properly
	if (propertyId && userId) {
		var res = await query(
			process.env.DB_NAME, 
			`UPDATE Properties SET assigned_user_id = ${mysql.escape(userId)} WHERE id = ${propertyId}`
		);
		return res;
	}
	return null;
}

async function queryDatabase(mysqlConnection, database, query) {
	return new Promise((resolve, reject) => {
		mysqlConnection.query(`use ${database}`);

		mysqlConnection.query(query, (e, results, fields) => {
			if (e) {
				return reject(new Error(thisFilename + ' => queryDatabase(), error in query:\n' + e.stack));
			}
			return resolve(results);
		});
	});
}

function closeDatabaseConnection(mysqlConnection) {
	if (!mysqlConnection || !mysqlConnection.threadId) {
		return;
	}
	try {
		mysqlConnection.end((e) => {
			if (e) {
				throw new Error(thisFilename + ' => closeDatabaseConnection(), unable to close connection:\n' + e);
			}
		});
	} catch(e) {
		throw new Error(thisFilename + ' => closeDatabaseConnection(), caught exception:\n' + e);
	}
}

async function getDatabaseConnection() {
	return new Promise((resolve, reject) => {
		try {
			if (process.env.NODE_ENV == 'development') {
				 var conn = mysql.createConnection({
					user: process.env.DB_USER,
					password: process.env.DB_PASSWORD,
					host: process.env.DB_HOST,
					database: process.env.DB_NAME
				});
			} else if (process.env.NODE_ENV == 'test'){
				 var conn = mysql.createConnection({
					user: process.env.DB_USER,
					password: process.env.DB_PASSWORD,
					host: process.env.DB_HOST,
					database: process.env.DB_NAME
				 })
			} else {
				 var conn = mysql.createConnection({
					user: process.env.DB_USER,
					password: process.env.DB_PASSWORD,
					host: process.env.DB_HOST,
					database: process.env.DB_NAME
				});
			}

			conn.connect((e) => {
				if (e) {
					conn.end(() => {}); // assume that this correctly ends the connection
					return reject(new Error(thisFilename + ' => getDatabaseConnection(), unable to connect to database:\n' + e.stack));
				}
				return resolve(conn);
			});

		} catch(e) {
			return reject(new Error(thisFilename + ' => getDatabaseConnection(), caught exception:\n' + e.stack));
		}
	});
}

module.exports.getDatabaseConnection = getDatabaseConnection;
module.exports.closeDatabaseConnection = closeDatabaseConnection;
module.exports.createUser = createUser;
module.exports.doesUserExist = doesUserExist;
module.exports.queryDatabase = queryDatabase;
module.exports.getUpdatePropertiesList = getUpdatePropertiesList;
module.exports.getProperty = getProperty;
module.exports.updateSessionId = updateSessionId;
module.exports.deleteSessionId=deleteSessionId;
module.exports.getUser = getUser;
module.exports.query = query;
module.exports.updateData = updateData;
module.exports.deleteData = deleteData;
module.exports.getPropertyAssignedUser = getPropertyAssignedUser;
module.exports.unassignUser = unassignUser;
module.exports.assign_property_to_user = assign_property_to_user;
module.exports.getPropertyVerifications = getPropertyVerifications;
module.exports.getAllPropertyVerifications = getAllPropertyVerifications;
module.exports.getAllProperties = getAllProperties;
module.exports.getAllPropertiesAllFields = getAllPropertiesAllFields;
module.exports.createProperty = createProperty;
module.exports.getPropertyNotes = getPropertyNotes;
