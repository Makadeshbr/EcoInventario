package response

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/allan/ecoinventario/internal/shared/apperror"
)

// JSON serializa o payload como JSON e escreve na response com o status code informado.
func JSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if payload != nil {
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			slog.Error("falha ao serializar response JSON", "error", err)
		}
	}
}

// HandleError mapeia AppError para response HTTP ou retorna 500 genérico.
// Detalhes internos vão para o log, nunca para a response.
func HandleError(w http.ResponseWriter, r *http.Request, err error) {
	var appErr *apperror.AppError
	if errors.As(err, &appErr) {
		JSON(w, appErr.Status, map[string]any{
			"error": map[string]any{
				"code":       appErr.Code,
				"message":    appErr.Message,
				"request_id": r.Header.Get("X-Request-Id"),
			},
		})
		return
	}

	// Erro interno: loga detalhes, retorna mensagem genérica
	slog.Error("internal error",
		"error", err,
		"request_id", r.Header.Get("X-Request-Id"),
		"method", r.Method,
		"path", r.URL.Path,
	)
	JSON(w, http.StatusInternalServerError, map[string]any{
		"error": map[string]any{
			"code":       "INTERNAL_ERROR",
			"message":    "Erro interno",
			"request_id": r.Header.Get("X-Request-Id"),
		},
	})
}

// BadRequest retorna erro 400 com mensagem customizada.
func BadRequest(w http.ResponseWriter, r *http.Request, msg string) {
	JSON(w, http.StatusBadRequest, map[string]any{
		"error": map[string]any{
			"code":       "BAD_REQUEST",
			"message":    msg,
			"request_id": r.Header.Get("X-Request-Id"),
		},
	})
}

// ValidationError retorna erro 400 formatado para erros de validação do validator/v10.
func ValidationError(w http.ResponseWriter, r *http.Request, err error) {
	JSON(w, http.StatusBadRequest, map[string]any{
		"error": map[string]any{
			"code":       "VALIDATION_ERROR",
			"message":    "Dados inválidos",
			"details":    err.Error(),
			"request_id": r.Header.Get("X-Request-Id"),
		},
	})
}
