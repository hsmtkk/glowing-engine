package function

import (
	"net/http"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

func init() {
	functions.HTTP("EntryPoint", EntryPoint)
}

func EntryPoint(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello, World!"))
}
