const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('BusinessInfo');

const create = require('./create');
const summary = require('./summary');
const update = require('./update');
const remove = require('./remove');
const sendMail = require('./sendMail');
const paginatedList = require('./paginatedList');

methods.list = paginatedList;
methods.mail = sendMail;
methods.create = create;
methods.update = update;
methods.delete = remove;
methods.summary = summary;

module.exports = methods;
