export function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Validation error",
        details: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message
        }))
      });
    }

    req.body = parsed.data;
    next();
  };
}
