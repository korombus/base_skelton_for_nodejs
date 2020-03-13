var express = require('express');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var forgotPass = require('./../controller/forgotChangePassword.js');
var router = express.Router();

var err = {
  'faildError': false,
  'faildExpire': false,
  'errEmpty': false,
  'errReEmpty': false,
  'errfaildRePass': false,
  'errUserIdNotFound': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  // トークンがあるかを確認
  forgotPass.checkReserveToken(req.query.token).then(function(checkTokenCount){
    // トークンがあれば期限が切れていないかをまず確認
    if(checkTokenCount[0]['count'] > 0){
      forgotPass.checkReserveToToken(req.query.token).then(function(checkYetToken){
        // 期限が切れている
        if(util.isEmpty(checkYetToken[0])){
          // ステータスを期限切れに変更して期限切れエラーを表示
          forgotPass.updateStatusToExpired(req.query.token).then(function(result){
            // 期限切れである旨を表示
            err.faildExpire = true;
            res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
          }).catch(function(err){
            // 期限切れステータス更新エラー
            err.errOther = true;
            res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
          });
        } else {
          // 期限が切れてない場合は入力フォームを表示
          res.render('change_password', { message: req.location_page_lang, err: err, token: req.query_token, _csrf: req.csrfToken() });
        }
      }).catch(function(err){
        // トークン期限確認エラー
        err.errOther = true;
        res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
      });
    } else {
      // 予約がない場合は不正URL
      err.faildError = true;
      res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
    }
  }).catch(function(){
    // トークン確認エラー
    err.errOther = true;
    res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
  });
});

router.post('/', function(req, res, next) {
  util.resetObjectArray(err);
  // 新しいパスワード入力確認
  err.errEmpty = util.isEmpty(req.body.password);
  // パスワード確認入力確認
  err.errReEmpty = util.isEmpty(req.body.rePassword);

  // 新しいパスと確認パスが入力されているときに同じ値かを確認
  if(!err.errEmpty && !err.errReEmpty){
    // 新しいパスワードと確認パスワードが合っているかどうか
    err.errfaildRePass = req.body.password !== req.body.rePassword;
  }

  if(util.checkObjectArray(err)){
    res.render('change_password', { message: req.location_page_lang, err: err, token: req.body.token, _csrf: req.body._csrf });
  } else {
    // トークンからemailの情報を取得
    forgotPass.checkReserveToToken(req.query.token).then(function(email){
      // パスワード変更中に期限が切れる可能性もあるので期限切れ部分を用意
      if(util.isEmpty(email[0])){
        // ステータスを期限切れに変更して期限切れエラーを表示
        forgotPass.updateStatusToExpired(req.query.token).then(function(result){
          // 期限切れである旨を表示
          err.faildExpire = true;
          res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
        }).catch(function(err){
          // 期限切れステータス更新エラー
          err.errOther = true;
          res.render('change_password', { message: req.location_page_lang, err: err, faild:true });
        });
      } else {
        // パスワードを暗号化
        var passwordHex = util.md5hex(req.body.password);

        // パスワード更新
        user.getUserId(email[0]['email']).then(function(userId){
          // ユーザーIDがないことはあり得ないとは思うけれども、ここに来た場合はユーザーいないよエラーを表示
          if(util.isEmpty(userId[0])){
            err.errUserIdNotFound = true;
            res.render('change_password', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
          } else {
            // パスワードを新しいものに更新
            user.updateUserData(userId[0]['user_id'], email[0]['email'], {'password': '00'}, [passwordHex]).then(function(rows){
              // 予約ステータスを完了に更新
              forgotPass.updateRegisterReserveStatus(req.body.email, ['DONE']).then(function(result){
                res.render('change_password', { message: req.location_page_lang, success: true, err: err, _csrf: req.body._csrf });
              }).catch(function(err){
                // 予約ステータスが残っててもとりあえず更新は成功しているのでログイン画面に促す
                res.render('change_password', { message: req.location_page_lang, success: true, err: err, _csrf: req.body._csrf });
              });
            }).catch(function(err){
              // パスワード更新エラー
              err.errOther = true;
              res.render('change_password', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
            });
          }
        }).catch(function(err){
          // ID検索エラー
          err.errOther = true;
          res.render('change_password', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
        });
      }
    }).catch(function(err){
      // トークン確認エラー
      err.errOther = true;
      res.render('change_password', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
    });
  }
});

module.exports = router;
