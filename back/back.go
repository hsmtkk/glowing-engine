package function

import (
	"encoding/json"
	"log"
	"net/http"
	"os"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
	"github.com/hsmtkk/glowing-engine/back/gourmetsearch"
)

func init() {
	functions.HTTP("EntryPoint", EntryPoint)
}

func EntryPoint(w http.ResponseWriter, r *http.Request) {
	gourmetSearchAPIKey := requiredEnvVar("GOURMET_SEARCH_API_KEY")
	params := r.URL.Query()
	keyword := params.Get("keyword")
	result, err := gourmetsearch.New(gourmetSearchAPIKey).Search(keyword)
	if err != nil {
		log.Fatal(err)
	}
	encoded, err := json.Marshal(result)
	if err != nil {
		log.Fatal(err)
	}
	w.WriteHeader(http.StatusOK)
	w.Write(encoded)
}

func requiredEnvVar(name string) string {
	val := os.Getenv(name)
	if val == "" {
		log.Fatalf("%s env var is not defined", val)
	}
	return val
}
