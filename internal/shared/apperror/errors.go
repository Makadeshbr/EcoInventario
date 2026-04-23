package apperror

import "fmt"

// AppError representa um erro de aplicação com código HTTP e código de erro estruturado.
// Implementa a interface error.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

func (e *AppError) Error() string { return e.Message }

// NewNotFound cria erro 404 para entidade não encontrada.
func NewNotFound(entity, id string) *AppError {
	return &AppError{
		Code:    "NOT_FOUND",
		Message: fmt.Sprintf("%s não encontrado", entity),
		Status:  404,
	}
}

// NewConflict cria erro 409 para conflitos de dados.
func NewConflict(msg string) *AppError {
	return &AppError{Code: "CONFLICT", Message: msg, Status: 409}
}

// NewForbidden cria erro 403 para acesso negado.
func NewForbidden(msg string) *AppError {
	return &AppError{Code: "FORBIDDEN", Message: msg, Status: 403}
}

// NewInvalidStatusTransition cria erro 409 para transições de status inválidas.
func NewInvalidStatusTransition(from, to string) *AppError {
	return &AppError{
		Code:    "INVALID_STATUS_TRANSITION",
		Message: fmt.Sprintf("Transição de '%s' para '%s' não permitida", from, to),
		Status:  409,
	}
}

// NewValidation cria erro 400 para dados inválidos.
func NewValidation(msg string) *AppError {
	return &AppError{Code: "VALIDATION_ERROR", Message: msg, Status: 400}
}

// NewUnauthorized cria erro 401 para autenticação inválida ou ausente.
func NewUnauthorized(msg string) *AppError {
	return &AppError{Code: "UNAUTHORIZED", Message: msg, Status: 401}
}
