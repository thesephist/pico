package main

import (
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

const dbPath = "./data.json"

func ensureDataDirExists() {
	_, err := os.Stat(dbPath)
	if os.IsNotExist(err) {
		dataFile, err := os.OpenFile(dbPath, os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			log.Fatal(err)
		}
		defer dataFile.Close()

		// empty JSON array
		_, err = dataFile.Write([]byte("[]"))
		if err != nil {
			log.Fatal(err)
		}
	} else if err != nil {
		log.Fatal(err)
	}
}

func writeErr(w http.ResponseWriter, err error) {
	w.WriteHeader(http.StatusInternalServerError)
	io.WriteString(w, err.Error())
}

func save(data []byte) error {
	file, err := os.OpenFile(dbPath, os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer file.Close()

	_, err = file.Write(data)
	return err
}

func get() ([]byte, error) {
	file, err := os.Open(dbPath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	return ioutil.ReadAll(file)
}

func handleSave(w http.ResponseWriter, r *http.Request) {
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		writeErr(w, err)
		return
	}
	err = save(data)
	if err != nil {
		writeErr(w, err)
		return
	}
}

func handleGet(w http.ResponseWriter, r *http.Request) {
	data, err := get()
	if err != nil {
		writeErr(w, err)
		return
	}

	w.Write(data)
}

func index(w http.ResponseWriter, r *http.Request) {
	indexFile, err := os.Open("./static/index.html")
	if err != nil {
		io.WriteString(w, "error reading index")
		return
	}
	defer indexFile.Close()

	io.Copy(w, indexFile)
}

func main() {
	ensureDataDirExists()

	r := mux.NewRouter()

	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:9110",
		WriteTimeout: 60 * time.Second,
		ReadTimeout:  60 * time.Second,
	}

	r.HandleFunc("/", index)
	r.Methods("POST").Path("/data").HandlerFunc(handleSave)
	r.Methods("GET").Path("/data").HandlerFunc(handleGet)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./static"))))

	log.Printf("Pico listening on %s\n", srv.Addr)
	log.Fatal(srv.ListenAndServe())
}
