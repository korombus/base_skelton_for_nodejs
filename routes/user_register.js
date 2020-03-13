var express = require('express');
var conf = require('config');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var register = require('./../controller/registerUser.js');
var router = express.Router();

router.get('/', function(req, res, next) {
  // トークンがあるかをまず確認
  register.checkReserveToken(req.query.token).then(function(checkToken){
    if(checkToken[0]['count'] > 0){
      // 期限内かを確認
      register.checkReserveTerm(req.query.token).then(function(checkTerm){
        if(!util.isEmpty(checkTerm[0])){
          // ユーザーを本登録するためにuser_idを取得
          user.getUserId(checkTerm[0]['email']).then(function(userid){
            // ユーザー登録状態を更新
            user.updateUserData(userid[0]['user_id'], checkTerm[0]['email'], {'status': 0, 'user_role': 0}, ['OK', conf.userRoleCode.registerUser]).then(function(rows){
              // 登録予約のステータスも更新
              register.updateRegisterReserveStatus(checkTerm[0]['email'], 'YET', {'status': 0}, ['DONE']).then(function(rows){
                res.render('user_register', { message: req.location_page_lang, success: true });
              }).catch(function(err){
                // 予約更新エラー
                res.render('user_register', { message: req.location_page_lang, errorOther: true });
              });
            }).catch(function(err){
              // 登録状態更新エラー
              res.render('user_register', { message: req.location_page_lang, errorOther: true });
            });
          });
        } else {
          // 予約状態を期限切れに更新するために登録情報を取得
          register.getReserveData(req.query.token).then(function(token){
            // 予約状態を期限切れに更新
            register.updateRegisterReserveStatus(token[0]['email'], 'YET', {'status': 0}, ['EXPIRED']).then(function(rows){
              // 期限切れ
              res.render('user_register', { message: req.location_page_lang, expire: true });
            }).catch(function(err){
              // 予約状態更新エラー
              res.render('user_register', { message: req.location_page_lang, errorOther: true });
            });
          }).catch(function(err){
            // 予約情報取得エラー
            res.render('user_register', { message: req.location_page_lang, errorOther: true });
          });
        }
      }).catch(function(err){
        // user_id取得エラー
        res.render('user_register', { message: req.location_page_lang, errorOther: true });
      });
    } else {
      // 無効なURL
      res.render('user_register', { message: req.location_page_lang, error: true });
    }
  }).catch(function(err){
    // トークン確認エラー
    res.render('user_register', { message: req.location_page_lang, errorOther: true });
  });
});

module.exports = router;
