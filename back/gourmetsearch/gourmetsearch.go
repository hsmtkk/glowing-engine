package gourmetsearch

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

const GOURMET_SEARCH_URL = "http://webservice.recruit.co.jp/hotpepper/gourmet/v1/"

type Result struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
}

type Searcher interface {
	Search(keyword string) ([]Result, error)
}

type searcherImpl struct {
	apiKey string
}

func New(apiKey string) Searcher {
	return &searcherImpl{apiKey}
}

type responseSchema struct {
	Name string `json`
}

func (s *searcherImpl) Search(keyword string) ([]Result, error) {
	url, err := url.Parse(GOURMET_SEARCH_URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL %s: %w", GOURMET_SEARCH_URL, err)
	}
	query := url.Query()
	query.Set("key", s.apiKey)
	query.Set("keyword", keyword)
	query.Set("format", "json")
	url.RawQuery = query.Encode()
	resp, err := http.Get(url.String())
	if err != nil {
		return nil, fmt.Errorf("failed to send HTTP GET: %w", err)
	}
	defer resp.Body.Close()
	contents, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	log.Print(string(contents))
	return nil, nil
}
