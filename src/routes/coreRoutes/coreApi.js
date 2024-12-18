const express = require('express');

const { catchErrors } = require('@/handlers/errorHandlers');

const router = express.Router();

const adminController = require('@/controllers/coreControllers/adminController');
const settingController = require('@/controllers/coreControllers/settingController');

const { singleStorageUpload } = require('@/middlewares/uploadMiddleware');
const authMiddleware = require('@/middlewares/authMiddleware'); // Adjust path as needed

// //_______________________________ Admin management_______________________________

router.route('/admin/read/:id').get(authMiddleware,catchErrors(adminController.read));

router.route('/admin/password-update/:id').patch(authMiddleware,catchErrors(adminController.updatePassword));

//_______________________________ Admin Profile _______________________________

router.route('/admin/profile/password').patch(authMiddleware,catchErrors(adminController.updateProfilePassword));
router
  .route('/admin/profile/update')
  .patch(authMiddleware,
    singleStorageUpload({ entity: 'admin', fieldName: 'photo', fileType: 'image' }),
    catchErrors(adminController.updateProfile)
  );

// //____________________________________________ API for Global Setting _________________

router.route('/setting/create').post(authMiddleware,catchErrors(settingController.create));
router.route('/setting/read/:id').get(authMiddleware,catchErrors(settingController.read));
router.route('/setting/update/:id').patch(authMiddleware,catchErrors(settingController.update));
//router.route('/setting/delete/:id).delete(catchErrors(settingController.delete));
router.route('/setting/search').get(authMiddleware,catchErrors(settingController.search));
router.route('/setting/list').get(authMiddleware,catchErrors(settingController.list));
router.route('/setting/listAll').get(authMiddleware,catchErrors(settingController.listAll));
router.route('/setting/filter').get(authMiddleware,catchErrors(settingController.filter));
router
  .route('/setting/readBySettingKey/:settingKey')
  .get(authMiddleware,catchErrors(settingController.readBySettingKey));
router.route('/setting/listBySettingKey').get(authMiddleware,catchErrors(settingController.listBySettingKey));
router
  .route('/setting/updateBySettingKey/:settingKey?')
  .patch(authMiddleware,catchErrors(settingController.updateBySettingKey));
router
  .route('/setting/upload/:settingKey?')
  .patch(authMiddleware,catchErrors(settingController.updateBySettingKey));
router.route('/setting/updateManySetting').patch(authMiddleware,catchErrors(settingController.updateManySetting));
module.exports = router;
