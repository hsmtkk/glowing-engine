package gourmetsearch

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
)

const GOURMET_SEARCH_URL = "http://webservice.recruit.co.jp/hotpepper/gourmet/v1/"

type Shop struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lon  float64 `json:"lon"`
}

type Searcher interface {
	Search(keyword string) ([]Shop, error)
}

type searcherImpl struct {
	apiKey string
}

func New(apiKey string) Searcher {
	return &searcherImpl{apiKey}
}

type responseSchema struct {
	Results responseSchemaResults `json:"results"`
}

type responseSchemaResults struct {
	Shops []responseSchemaShop `json:"shop"`
}

type responseSchemaShop struct {
	Name string  `json:"name"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

func (s *searcherImpl) Search(keyword string) ([]Shop, error) {
	url, err := url.Parse(GOURMET_SEARCH_URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse URL %s: %w", GOURMET_SEARCH_URL, err)
	}
	query := url.Query()
	query.Set("key", s.apiKey)
	query.Set("keyword", keyword)
	query.Set("format", "json")
	url.RawQuery = query.Encode()
	log.Print(url.String())
	resp, err := http.Get(url.String())
	if err != nil {
		return nil, fmt.Errorf("failed to send HTTP GET: %w", err)
	}
	defer resp.Body.Close()
	contents, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}
	resSchema := responseSchema{}
	if err := json.Unmarshal(contents, &resSchema); err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON: %w", err)
	}
	shops := []Shop{}
	for _, s := range resSchema.Results.Shops {
		shops = append(shops, Shop{
			Name: s.Name,
			Lat:  s.Lat,
			Lon:  s.Lng,
		})
	}
	return shops, nil
}
