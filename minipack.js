const path = require('path')
const babylon = require('babylon')
const traverse = require('babel-traverse')
const { transformFromAST } = require('babel-core')

let ID = 0

/**
 * @param {string} filename 
 * @returns {Object} {id, dependencies, assetMap, filename, code}
 */
function createAsset(filename) {

}

/**
 * 
 * @param {string} entry 
 * @returns {array} graph queue
 */
function createGraph(entry) {

}

/**
 * 
 * @param {array} graph 
 * @returns {string} bundle file string
 */
function bundle(graph) {

}