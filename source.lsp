(defmacro defun (name args body) (define name (lambda args body)))
