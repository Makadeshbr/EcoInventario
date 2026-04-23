package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	argonTime    = 1
	argonMemory  = 64 * 1024
	argonThreads = 4
	argonKeyLen  = 32
	argonSaltLen = 16
)

// HashPassword gera hash Argon2id com pepper e salt aleatório.
// Formato: $argon2id$v=19$m={m},t={t},p={p}${saltB64}${hashB64}
func HashPassword(password, pepper string) (string, error) {
	if password == "" {
		return "", errors.New("senha não pode ser vazia")
	}

	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("gerando salt: %w", err)
	}

	hash := argon2.IDKey([]byte(password+pepper), salt, argonTime, argonMemory, argonThreads, argonKeyLen)

	encoded := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	)
	return encoded, nil
}

// VerifyPassword verifica senha contra hash Argon2id com pepper.
func VerifyPassword(password, encodedHash, pepper string) (bool, error) {
	salt, hash, params, err := parseHash(encodedHash)
	if err != nil {
		return false, err
	}

	// formato do hash: m,t,p → params[0]=m(memory), params[1]=t(time), params[2]=p(threads)
	// argon2.IDKey recebe: (password, salt, time, memory, threads, keyLen)
	computed := argon2.IDKey([]byte(password+pepper), salt, params[1], params[0], uint8(params[2]), argonKeyLen)

	if subtle.ConstantTimeCompare(hash, computed) == 1 {
		return true, nil
	}
	return false, nil
}

// parseHash decodifica o hash no formato $argon2id$v=...
func parseHash(encoded string) (salt, hash []byte, params [3]uint32, err error) {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return nil, nil, params, errors.New("formato de hash inválido")
	}

	var version int
	if _, scanErr := fmt.Sscanf(parts[2], "v=%d", &version); scanErr != nil {
		return nil, nil, params, fmt.Errorf("versão inválida: %w", scanErr)
	}

	paramParts := strings.Split(parts[3], ",")
	if len(paramParts) != 3 {
		return nil, nil, params, errors.New("parâmetros inválidos no hash")
	}

	for i, p := range paramParts {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) != 2 {
			return nil, nil, params, errors.New("parâmetro malformado")
		}
		val, parseErr := strconv.ParseUint(kv[1], 10, 32)
		if parseErr != nil {
			return nil, nil, params, fmt.Errorf("valor inválido em %s: %w", kv[0], parseErr)
		}
		params[i] = uint32(val)
	}

	salt, err = base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, params, fmt.Errorf("salt inválido: %w", err)
	}

	hash, err = base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, params, fmt.Errorf("hash inválido: %w", err)
	}

	return salt, hash, params, nil
}
