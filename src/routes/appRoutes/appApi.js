const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');
const authMiddleware = require('@/middlewares/authMiddleware'); // Adjust path as needed


const routerApp = (entity, controller) => {
  router.route(`/${entity}/create`).post(authMiddleware,catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(authMiddleware,catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(authMiddleware,catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(authMiddleware,catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(authMiddleware,catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(authMiddleware,catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(authMiddleware,catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(authMiddleware,catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(authMiddleware,catchErrors(controller['summary']));


  // Add createAndAssociate for the client entity
  if (entity === 'client') {
    router.route(`/${entity}/createAndAssociate`).post(authMiddleware,catchErrors(controller['createAndAssociate']));
  }

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(authMiddleware,catchErrors(controller['mail']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(authMiddleware,catchErrors(controller['convert']));
  }
};

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

module.exports = router;
