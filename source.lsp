(defmacro defun (name args body) (define name (lambda args body)))
(defun square (x) (* x x))
(square 10)
