pico = ./src/

all: run


run:
	go run -race ${pico}


# build for specific OS target
build-%:
	GOOS=$* GOARCH=amd64 go build -o pico-$* ${pico}


build:
	go build -o pico ${pico}


# clean any generated files
clean:
	rm -rvf pico pico-*
