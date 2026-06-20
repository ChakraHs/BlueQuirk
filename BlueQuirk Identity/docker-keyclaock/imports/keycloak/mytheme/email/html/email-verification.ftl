<#assign emailSubject = "Please verify your email address">
<!DOCTYPE html>
<html>
<head>
    <title>Verification Email</title>
</head>
<body>
    <p>Hello ${user.firstName} ${user.lastName},</p>
    <p>your Activation Key is <b cstyle="color: #FF5733;">${user.attributes.activationKey}</b></p>
</body>
</html>
