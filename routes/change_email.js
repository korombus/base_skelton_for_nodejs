var express = require('express');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var changeEmail = require('./../controller/changeEmail.js');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  // トークンがあるかを確認
  changeEmail.checkReserveToken(req.query.token).then(function(checkTokenCount){
    // 予約されていれば変更できるかを確認
    if(checkTokenCount[0]['count'] > 0){
      // トークンの期限が切れてないかを確認
      changeEmail.checkReserveToToken(req.query.token).then(function(checkToken){
        // トークンがあったらメールアドレスを変更
        if(!util.isEmpty(checkToken[0])){
          // メールアドレスを変更
          user.updateUserData(checkToken[0]['user_id'], checkToken[0]['current_email'], {'email': 0}, [checkToken[0]['new_email']]).then(function(result){
            // 予約状態を完了に更新
            changeEmail.updateRegisterReserveStatus(checkToken[0]['user_id'], {'status': 0}, ['DONE']).then(function(result){
              res.render('user_register', { message: req.location_page_lang, success: true });
            }).catch(function(err){
              // 予約状態変更エラー
              res.render('user_register', { message: req.location_page_lang, errorOther: true });
            });
          }).catch(function(err){
            // メールアドレス変更エラー
            res.render('user_register', { message: req.location_page_lang, errorOther: true });
          });
        } else {
          // トークンの期限が切れている場合はEXPIREDのステータスに更新
          changeEmail.updateRegisterReserveStatus(checkToken[0]['user_id'], {'status': 0}, ['EXPIRED']).then(function(result){
            // 期限切れエラー
            res.render('user_register', { message: req.location_page_lang, expire: true });
          }).catch(function(err){
            // 変更予約確認エラー
            res.render('user_register', { message: req.location_page_lang, errorOther: true });
          });
        }
      }).catch(function(err){
        // 変更予約確認エラー
        res.render('user_register', { message: req.location_page_lang, errorOther: true });
      });
    } else {
      // 予約されてないエラー
      res.render('user_register', { message: req.location_page_lang, error: true });
    }
  }).catch(function(err){
    // 変更予約確認エラー
    res.render('user_register', { message: req.location_page_lang, errorOther: true });
  });
});

module.exports = router;
