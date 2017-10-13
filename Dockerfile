FROM mbgl/ci:r4-linux-clang-3.9-node-4

WORKDIR /usr/src/app
# Install app dependencies
COPY package.json .
# For npm@5 or later, copy package-lock.json as well
# COPY package.json package-lock.json ./
ENV NODE_ENV production
RUN npm install
RUN npm install --build-from-source git://github.com/mapbox/mapbox-gl-native.git#master
# Bundle app source
COPY . .

EXPOSE 4040

CMD [ "./run.sh" ]