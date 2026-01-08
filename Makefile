.PHONY: dev front back stop

dev:
	$(MAKE) -j 2 front back

front:
	cd front && bun run dev

back:
	cd back && bun run dev
