const { validationResult } = require("express-validator");

/** Put this after a chain of express-validator checks. Returns 422 with the first
    problem found instead of letting bad data reach a controller. */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array()[0].msg, fields: errors.array() });
  }
  next();
}

module.exports = validate;
